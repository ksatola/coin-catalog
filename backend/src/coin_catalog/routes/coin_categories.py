from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from coin_catalog.collection_stats import recalculate_collection_stats
from coin_catalog.database import get_db
from coin_catalog.models import Category, Coin
from coin_catalog.routes.categories import get_category
from coin_catalog.schemas import CategoryResponse

router = APIRouter(prefix="/coins/{coin_id}/categories", tags=["coin-categories"])


def get_coin(coin_id: int, session: Session) -> Coin:
    coin = session.get(Coin, coin_id)
    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )
    return coin


@router.get("", response_model=list[CategoryResponse])
def list_coin_categories(
    coin_id: int,
    session: Session = Depends(get_db),
) -> list[CategoryResponse]:
    coin = get_coin(coin_id, session)
    return [
        CategoryResponse.model_validate(category)
        for category in sorted(coin.categories, key=lambda item: item.name)
    ]


@router.post("/{category_id}", response_model=CategoryResponse)
def attach_category(
    coin_id: int,
    category_id: int,
    session: Session = Depends(get_db),
) -> Category:
    coin = get_coin(coin_id, session)
    category = get_category(category_id, session)
    if category not in coin.categories:
        coin.categories.append(category)
        recalculate_collection_stats(
            coin.collection,
            session,
            modified_at=datetime.now(UTC),
        )
        session.commit()
        session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def detach_category(
    coin_id: int,
    category_id: int,
    session: Session = Depends(get_db),
) -> None:
    coin = get_coin(coin_id, session)
    category = get_category(category_id, session)
    if category not in coin.categories:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category is not attached to coin",
        )
    coin.categories.remove(category)
    recalculate_collection_stats(
        coin.collection,
        session,
        modified_at=datetime.now(UTC),
    )
    session.commit()
