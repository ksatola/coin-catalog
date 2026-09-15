from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from coin_catalog.coin_search import build_coin_query
from coin_catalog.database import get_db
from coin_catalog.models import Coin
from coin_catalog.schemas import CoinCreate, CoinResponse, CoinUpdate

router = APIRouter(prefix="/coins", tags=["coins"])


@router.post(
    "",
    response_model=CoinResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_coin(
    coin_data: CoinCreate,
    session: Session = Depends(get_db),
) -> Coin:
    coin = Coin(**coin_data.model_dump())
    session.add(coin)
    session.commit()
    session.refresh(coin)
    return coin


@router.get("", response_model=list[CoinResponse])
def list_coins(
    search: str | None = None,
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
) -> list[Coin]:
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

    statement = build_coin_query(
        search=search,
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
    return list(session.scalars(statement).all())


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

    for field, value in coin_data.model_dump().items():
        setattr(coin, field, value)

    session.commit()
    session.refresh(coin)
    return coin


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
    session.commit()
    session.refresh(coin)
    return coin
