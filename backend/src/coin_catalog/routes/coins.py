from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

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
def list_coins(session: Session = Depends(get_db)) -> list[Coin]:
    statement = (
        select(Coin)
        .where(Coin.is_deleted.is_(False))
        .order_by(Coin.id)
    )
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
