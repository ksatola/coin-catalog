import logging
from datetime import UTC, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from coin_catalog.coin_move import move_coin
from coin_catalog.coin_pagination import (
    CoinCursor,
    apply_after_cursor,
    apply_before_cursor,
    decode_cursor,
    encode_cursor,
)
from coin_catalog.coin_search import build_coin_query
from coin_catalog.collection_stats import recalculate_collection_stats
from coin_catalog.database import SessionLocal, get_db
from coin_catalog.image_storage import collection_images_dir, thumbnail_path
from coin_catalog.models import Coin, CoinImage, Collection
from coin_catalog.schemas import (
    CoinCreate,
    CoinListResponse,
    CoinMoveRequest,
    CoinNavigationResponse,
    CoinPageResponse,
    CoinResponse,
    CoinUpdate,
)
from coin_catalog.thumbnails import (
    THUMBNAIL_GENERATOR_VERSION,
    ThumbnailGenerationError,
    ensure_thumbnail_file,
    thumbnail_metadata_is_current,
)

router = APIRouter(prefix="/coins", tags=["coins"])
logger = logging.getLogger(__name__)

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 50


def get_collection_or_404(collection_id: int, session: Session) -> Collection:
    collection = session.get(Collection, collection_id)

    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    return collection


def validate_coin_query(
    search: str | None,
    quick_search: str | None,
    modes: dict[str, str],
    coin_status: str,
    sort_by: str,
    sort_order: str,
) -> None:
    for text in (search, quick_search):
        if text:
            tokens = [token for token in text.split() if token]
            if any(len(token) < 3 for token in tokens):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Search terms must contain at least 3 characters",
                )

    if any(mode not in {"include", "exclude"} for mode in modes.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filter mode",
        )

    if coin_status not in {"active", "archived", "all"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status filter",
        )
    if sort_by not in {"id", "from_year", "to_year"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sort field",
        )
    if sort_order not in {"asc", "desc"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid sort order",
        )


def build_filtered_coin_query(
    *,
    search: str | None,
    search_mode: str,
    quick_search: str | None,
    quick_search_mode: str,
    collection_id: list[int] | None,
    country_id: list[int] | None,
    country_mode: str,
    issuer_id: list[int] | None,
    issuer_mode: str,
    denomination_id: list[int] | None,
    denomination_mode: str,
    mint_id: list[int] | None,
    mint_mode: str,
    material_id: list[int] | None,
    material_mode: str,
    state_id: list[int] | None,
    state_mode: str,
    era_id: list[int] | None,
    era_mode: str,
    category_id: list[int] | None,
    category_mode: str,
    include_category_children: bool,
    from_year: int | None,
    to_year: int | None,
    year_mode: str,
    has_image: bool | None,
    image_mode: str,
    has_video: bool | None,
    video_mode: str,
    coin_status: str,
    sort_by: str,
    sort_order: str,
):
    return build_coin_query(
        search=search,
        search_mode=search_mode,
        quick_search=quick_search,
        quick_search_mode=quick_search_mode,
        collection_ids=collection_id,
        country_ids=country_id,
        country_mode=country_mode,
        issuer_ids=issuer_id,
        issuer_mode=issuer_mode,
        denomination_ids=denomination_id,
        denomination_mode=denomination_mode,
        mint_ids=mint_id,
        mint_mode=mint_mode,
        material_ids=material_id,
        material_mode=material_mode,
        state_ids=state_id,
        state_mode=state_mode,
        era_ids=era_id,
        era_mode=era_mode,
        category_ids=category_id,
        category_mode=category_mode,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        year_mode=year_mode,
        has_image=has_image,
        image_mode=image_mode,
        has_video=has_video,
        video_mode=video_mode,
        status_filter=coin_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )


def load_list_images(statement):
    return statement.options(
        selectinload(Coin.images.and_(CoinImage.kind.in_(("avers", "rewers"))))
    )


def ensure_page_thumbnails(page_coins: list[Coin], session: Session) -> None:
    changed = False

    for coin in page_coins:
        for image in coin.images:
            original_path = collection_images_dir(coin.collection_id) / image.filename
            thumbnail_file = thumbnail_path(coin.collection_id, image.filename)

            if not original_path.is_file():
                continue

            if thumbnail_metadata_is_current(
                source_path=original_path,
                target_path=thumbnail_file,
                image_revision=image.revision,
                thumbnail_revision=image.thumbnail_revision,
                thumbnail_generator_version=image.thumbnail_generator_version,
            ):
                continue

            try:
                ensure_thumbnail_file(original_path, thumbnail_file)
            except ThumbnailGenerationError:
                logger.warning(
                    "Could not generate thumbnail for coin_image %s",
                    image.id,
                )
                continue

            image.thumbnail_revision = image.revision
            image.thumbnail_generator_version = THUMBNAIL_GENERATOR_VERSION
            changed = True

    if changed:
        session.commit()


def reconcile_page_thumbnails(coin_ids: list[int]) -> None:
    if not coin_ids:
        return

    with SessionLocal() as session:
        statement = load_list_images(
            build_coin_query(status_filter="all").where(Coin.id.in_(coin_ids))
        )
        page_coins = list(session.scalars(statement).all())
        ensure_page_thumbnails(page_coins, session)


def cursor_for_coin(coin: Coin, sort_by: str, sort_order: str) -> CoinCursor:
    sort_value = {
        "id": coin.id,
        "from_year": coin.from_year,
        "to_year": coin.to_year,
    }[sort_by]
    return CoinCursor(
        sort_by=sort_by,
        sort_order=sort_order,
        sort_value=sort_value,
        coin_id=coin.id,
    )


@router.post(
    "",
    response_model=CoinResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_coin(
    coin_data: CoinCreate,
    session: Session = Depends(get_db),
) -> Coin:
    collection = get_collection_or_404(coin_data.collection_id, session)

    coin = Coin(**coin_data.model_dump())
    session.add(coin)
    session.flush()
    recalculate_collection_stats(collection, session)
    session.commit()
    session.refresh(coin)
    return coin


@router.get(
    "",
    response_model=list[CoinListResponse] | CoinPageResponse,
)
def list_coins(
    background_tasks: BackgroundTasks,
    search: str | None = None,
    search_mode: str = "include",
    quick_search: str | None = None,
    quick_search_mode: str = "include",
    collection_id: list[int] | None = Query(None),
    country_id: list[int] | None = Query(None),
    country_mode: str = "include",
    issuer_id: list[int] | None = Query(None),
    issuer_mode: str = "include",
    denomination_id: list[int] | None = Query(None),
    denomination_mode: str = "include",
    mint_id: list[int] | None = Query(None),
    mint_mode: str = "include",
    material_id: list[int] | None = Query(None),
    material_mode: str = "include",
    state_id: list[int] | None = Query(None),
    state_mode: str = "include",
    era_id: list[int] | None = Query(None),
    era_mode: str = "include",
    category_id: list[int] | None = Query(None),
    category_mode: str = "include",
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    year_mode: str = "include",
    has_image: bool | None = None,
    image_mode: str = "include",
    has_video: bool | None = None,
    video_mode: str = "include",
    coin_status: str = Query("active", alias="status"),
    sort_by: str = "id",
    sort_order: str = "asc",
    limit: int | None = Query(None, ge=1, le=MAX_PAGE_SIZE),
    cursor: str | None = None,
    session: Session = Depends(get_db),
) -> list[Coin] | CoinPageResponse:
    validate_coin_query(
        search,
        quick_search,
        {
            "search_mode": search_mode,
            "quick_search_mode": quick_search_mode,
            "country_mode": country_mode,
            "issuer_mode": issuer_mode,
            "denomination_mode": denomination_mode,
            "mint_mode": mint_mode,
            "material_mode": material_mode,
            "state_mode": state_mode,
            "era_mode": era_mode,
            "category_mode": category_mode,
            "year_mode": year_mode,
            "image_mode": image_mode,
            "video_mode": video_mode,
        },
        coin_status,
        sort_by,
        sort_order,
    )

    if cursor is not None and limit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cursor requires limit",
        )

    statement = build_filtered_coin_query(
        search=search,
        search_mode=search_mode,
        quick_search=quick_search,
        quick_search_mode=quick_search_mode,
        collection_id=collection_id,
        country_id=country_id,
        country_mode=country_mode,
        issuer_id=issuer_id,
        issuer_mode=issuer_mode,
        denomination_id=denomination_id,
        denomination_mode=denomination_mode,
        mint_id=mint_id,
        mint_mode=mint_mode,
        material_id=material_id,
        material_mode=material_mode,
        state_id=state_id,
        state_mode=state_mode,
        era_id=era_id,
        era_mode=era_mode,
        category_id=category_id,
        category_mode=category_mode,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        year_mode=year_mode,
        has_image=has_image,
        image_mode=image_mode,
        has_video=has_video,
        video_mode=video_mode,
        coin_status=coin_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    if limit is None:
        statement = load_list_images(statement)
        return list(session.scalars(statement).all())

    coin_cursor = (
        decode_cursor(cursor, sort_by, sort_order) if cursor is not None else None
    )
    if coin_cursor is not None:
        statement = apply_after_cursor(statement, coin_cursor)

    statement = load_list_images(statement).limit(limit + 1)
    coins = list(session.scalars(statement).all())
    has_more = len(coins) > limit
    page_coins = coins[:limit]
    background_tasks.add_task(
        reconcile_page_thumbnails, [coin.id for coin in page_coins]
    )

    next_cursor = (
        encode_cursor(cursor_for_coin(page_coins[-1], sort_by, sort_order))
        if has_more and page_coins
        else None
    )
    page_items = [CoinListResponse.model_validate(coin) for coin in page_coins]

    return CoinPageResponse(
        items=page_items,
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.get("/{coin_id}/navigation", response_model=CoinNavigationResponse)
def coin_navigation(
    coin_id: int,
    search: str | None = None,
    search_mode: str = "include",
    quick_search: str | None = None,
    quick_search_mode: str = "include",
    collection_id: list[int] | None = Query(None),
    country_id: list[int] | None = Query(None),
    country_mode: str = "include",
    issuer_id: list[int] | None = Query(None),
    issuer_mode: str = "include",
    denomination_id: list[int] | None = Query(None),
    denomination_mode: str = "include",
    mint_id: list[int] | None = Query(None),
    mint_mode: str = "include",
    material_id: list[int] | None = Query(None),
    material_mode: str = "include",
    state_id: list[int] | None = Query(None),
    state_mode: str = "include",
    era_id: list[int] | None = Query(None),
    era_mode: str = "include",
    category_id: list[int] | None = Query(None),
    category_mode: str = "include",
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    year_mode: str = "include",
    has_image: bool | None = None,
    image_mode: str = "include",
    has_video: bool | None = None,
    video_mode: str = "include",
    coin_status: str = Query("active", alias="status"),
    sort_by: str = "id",
    sort_order: str = "asc",
    session: Session = Depends(get_db),
) -> CoinNavigationResponse:
    validate_coin_query(
        search,
        quick_search,
        {
            "search_mode": search_mode,
            "quick_search_mode": quick_search_mode,
            "country_mode": country_mode,
            "issuer_mode": issuer_mode,
            "denomination_mode": denomination_mode,
            "mint_mode": mint_mode,
            "material_mode": material_mode,
            "state_mode": state_mode,
            "era_mode": era_mode,
            "category_mode": category_mode,
            "year_mode": year_mode,
            "image_mode": image_mode,
            "video_mode": video_mode,
        },
        coin_status,
        sort_by,
        sort_order,
    )

    coin = session.get(Coin, coin_id)
    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    statement = build_filtered_coin_query(
        search=search,
        search_mode=search_mode,
        quick_search=quick_search,
        quick_search_mode=quick_search_mode,
        collection_id=collection_id,
        country_id=country_id,
        country_mode=country_mode,
        issuer_id=issuer_id,
        issuer_mode=issuer_mode,
        denomination_id=denomination_id,
        denomination_mode=denomination_mode,
        mint_id=mint_id,
        mint_mode=mint_mode,
        material_id=material_id,
        material_mode=material_mode,
        state_id=state_id,
        state_mode=state_mode,
        era_id=era_id,
        era_mode=era_mode,
        category_id=category_id,
        category_mode=category_mode,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        year_mode=year_mode,
        has_image=has_image,
        image_mode=image_mode,
        has_video=has_video,
        video_mode=video_mode,
        coin_status=coin_status,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    current = session.scalar(statement.where(Coin.id == coin_id).limit(1))
    if current is None:
        return CoinNavigationResponse(previous_id=None, next_id=None)

    current_cursor = cursor_for_coin(current, sort_by, sort_order)

    previous_statement = apply_before_cursor(statement, current_cursor)
    reverse_sort_order = "desc" if sort_order == "asc" else "asc"
    previous_statement = (
        previous_statement.order_by(None)
        .order_by(
            (
                getattr(Coin, sort_by).desc()
                if reverse_sort_order == "desc"
                else getattr(Coin, sort_by).asc()
            ),
            Coin.id.desc(),
        )
        .limit(1)
    )
    previous = session.scalar(previous_statement)

    next_statement = apply_after_cursor(statement, current_cursor).limit(1)
    next_coin = session.scalar(next_statement)

    return CoinNavigationResponse(
        previous_id=previous.id if previous is not None else None,
        next_id=next_coin.id if next_coin is not None else None,
    )


@router.get("/archived", response_model=list[CoinResponse])
def list_archived_coins(session: Session = Depends(get_db)) -> list[Coin]:
    statement = build_coin_query(status_filter="archived")
    return list(session.scalars(statement).all())


@router.get("/{coin_id}", response_model=CoinResponse)
def get_coin(
    coin_id: int,
    session: Session = Depends(get_db),
) -> Coin:
    coin = session.get(Coin, coin_id)

    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    return coin


@router.put("/{coin_id}", response_model=CoinResponse)
def update_coin(
    coin_id: int,
    coin_data: CoinUpdate,
    session: Session = Depends(get_db),
) -> Coin:
    coin = session.get(Coin, coin_id)

    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    collection = get_collection_or_404(coin_data.collection_id, session)

    if coin_data.collection_id != coin.collection_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Coin collection must be changed through the move operation",
        )

    for field, value in coin_data.model_dump().items():
        setattr(coin, field, value)

    recalculate_collection_stats(collection, session, modified_at=datetime.now(UTC))
    session.commit()
    session.refresh(coin)
    return coin


@router.post("/{coin_id}/move", response_model=CoinResponse)
def move_coin_endpoint(
    coin_id: int,
    move_data: CoinMoveRequest,
    session: Session = Depends(get_db),
) -> Coin:
    return move_coin(coin_id, move_data.target_collection_id, session)


@router.post("/{coin_id}/archive", response_model=CoinResponse)
def archive_coin(
    coin_id: int,
    session: Session = Depends(get_db),
) -> Coin:
    coin = session.get(Coin, coin_id)

    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    coin.is_deleted = True
    collection = get_collection_or_404(coin.collection_id, session)
    recalculate_collection_stats(collection, session, modified_at=datetime.now(UTC))
    session.commit()
    session.refresh(coin)
    return coin


@router.post("/{coin_id}/restore", response_model=CoinResponse)
def restore_coin(
    coin_id: int,
    session: Session = Depends(get_db),
) -> Coin:
    coin = session.get(Coin, coin_id)

    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    coin.is_deleted = False
    collection = get_collection_or_404(coin.collection_id, session)
    recalculate_collection_stats(collection, session, modified_at=datetime.now(UTC))
    session.commit()
    session.refresh(coin)
    return coin
