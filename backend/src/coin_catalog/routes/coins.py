import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from coin_catalog.database import get_db
from coin_catalog.image_storage import collection_images_dir, thumbnail_path
from coin_catalog.models import Coin, CoinImage, Collection
from coin_catalog.thumbnails import (
    THUMBNAIL_GENERATOR_VERSION,
    ThumbnailGenerationError,
    ensure_thumbnail_file,
    thumbnail_metadata_is_current,
)
from coin_catalog.schemas import (
    CoinCreate,
    CoinListResponse,
    CoinMoveRequest,
    CoinNavigationResponse,
    CoinPageResponse,
    CoinResponse,
    CoinUpdate,
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
    coin_status: str,
    sort_by: str,
    sort_order: str,
) -> None:
    if search:
        tokens = [token for token in search.split() if token]
        if any(len(token) < 3 for token in tokens):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Search terms must contain at least 3 characters",
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
    collection_id: list[int] | None,
    country_id: list[int] | None,
    issuer_id: list[int] | None,
    denomination_id: list[int] | None,
    mint_id: list[int] | None,
    material_id: list[int] | None,
    state_id: list[int] | None,
    era_id: list[int] | None,
    category_id: list[int] | None,
    include_category_children: bool,
    from_year: int | None,
    to_year: int | None,
    has_image: bool | None,
    has_video: bool | None,
    coin_status: str,
    sort_by: str,
    sort_order: str,
):
    return build_coin_query(
        search=search,
        collection_ids=collection_id,
        country_ids=country_id,
        issuer_ids=issuer_id,
        denomination_ids=denomination_id,
        mint_ids=mint_id,
        material_ids=material_id,
        state_ids=state_id,
        era_ids=era_id,
        category_ids=category_id,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        has_image=has_image,
        has_video=has_video,
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
    search: str | None = None,
    collection_id: list[int] | None = Query(None),
    country_id: list[int] | None = Query(None),
    issuer_id: list[int] | None = Query(None),
    denomination_id: list[int] | None = Query(None),
    mint_id: list[int] | None = Query(None),
    material_id: list[int] | None = Query(None),
    state_id: list[int] | None = Query(None),
    era_id: list[int] | None = Query(None),
    category_id: list[int] | None = Query(None),
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    has_image: bool | None = None,
    has_video: bool | None = None,
    coin_status: str = Query("active", alias="status"),
    sort_by: str = "id",
    sort_order: str = "asc",
    limit: int | None = Query(None, ge=1, le=MAX_PAGE_SIZE),
    cursor: str | None = None,
    session: Session = Depends(get_db),
) -> list[Coin] | CoinPageResponse:
    validate_coin_query(search, coin_status, sort_by, sort_order)

    if cursor is not None and limit is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cursor requires limit",
        )

    statement = build_filtered_coin_query(
        search=search,
        collection_id=collection_id,
        country_id=country_id,
        issuer_id=issuer_id,
        denomination_id=denomination_id,
        mint_id=mint_id,
        material_id=material_id,
        state_id=state_id,
        era_id=era_id,
        category_id=category_id,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        has_image=has_image,
        has_video=has_video,
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
    ensure_page_thumbnails(page_coins, session)

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
    collection_id: list[int] | None = Query(None),
    country_id: list[int] | None = Query(None),
    issuer_id: list[int] | None = Query(None),
    denomination_id: list[int] | None = Query(None),
    mint_id: list[int] | None = Query(None),
    material_id: list[int] | None = Query(None),
    state_id: list[int] | None = Query(None),
    era_id: list[int] | None = Query(None),
    category_id: list[int] | None = Query(None),
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    has_image: bool | None = None,
    has_video: bool | None = None,
    coin_status: str = Query("active", alias="status"),
    sort_by: str = "id",
    sort_order: str = "asc",
    session: Session = Depends(get_db),
) -> CoinNavigationResponse:
    validate_coin_query(search, coin_status, sort_by, sort_order)

    coin = session.get(Coin, coin_id)
    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    statement = build_filtered_coin_query(
        search=search,
        collection_id=collection_id,
        country_id=country_id,
        issuer_id=issuer_id,
        denomination_id=denomination_id,
        mint_id=mint_id,
        material_id=material_id,
        state_id=state_id,
        era_id=era_id,
        category_id=category_id,
        include_category_children=include_category_children,
        from_year=from_year,
        to_year=to_year,
        has_image=has_image,
        has_video=has_video,
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
