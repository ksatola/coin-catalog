from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import get_db
from coin_catalog.models import (
    Coin,
    Country,
    Denomination,
    Era,
    Issuer,
    Material,
    Mint,
    State,
)
from coin_catalog.schemas import DictionaryItemCreate, DictionaryItemResponse

router = APIRouter(prefix="/dictionaries", tags=["dictionaries"])

DICTIONARIES = {
    "countries": Country,
    "issuers": Issuer,
    "denominations": Denomination,
    "mints": Mint,
    "materials": Material,
    "states": State,
    "eras": Era,
}

DICTIONARY_COIN_USAGE = {
    "countries": (Coin.country_id,),
    "issuers": (Coin.issuer_id,),
    "denominations": (Coin.denomination_id,),
    "mints": (Coin.mint_id,),
    "materials": (Coin.material_id,),
    "states": (Coin.state_id,),
    "eras": (Coin.from_era_id, Coin.to_era_id),
}


def get_dictionary_model(dictionary_name: str):
    model = DICTIONARIES.get(dictionary_name)
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dictionary not found",
        )
    return model


def is_dictionary_item_in_use(
    dictionary_name: str,
    item_id: int,
    session: Session,
) -> bool:
    usage_columns = DICTIONARY_COIN_USAGE[dictionary_name]

    for column in usage_columns:
        statement = select(Coin.id).where(column == item_id).limit(1)

        if session.scalar(statement) is not None:
            return True

    return False


@router.get(
    "/{dictionary_name}",
    response_model=list[DictionaryItemResponse],
)
def list_dictionary_items(
    dictionary_name: str,
    session: Session = Depends(get_db),
):
    model = get_dictionary_model(dictionary_name)
    statement = select(model).order_by(model.name)
    return list(session.scalars(statement).all())


@router.post(
    "/{dictionary_name}",
    response_model=DictionaryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_dictionary_item(
    dictionary_name: str,
    item_data: DictionaryItemCreate,
    session: Session = Depends(get_db),
):
    model = get_dictionary_model(dictionary_name)
    item = model(name=item_data.name.strip())

    if not item.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.put(
    "/{dictionary_name}/{item_id}",
    response_model=DictionaryItemResponse,
)
def update_dictionary_item(
    dictionary_name: str,
    item_id: int,
    item_data: DictionaryItemCreate,
    session: Session = Depends(get_db),
):
    model = get_dictionary_model(dictionary_name)
    item = session.get(model, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    name = item_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    item.name = name
    session.commit()
    session.refresh(item)
    return item


@router.delete(
    "/{dictionary_name}/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_dictionary_item(
    dictionary_name: str,
    item_id: int,
    session: Session = Depends(get_db),
) -> None:
    model = get_dictionary_model(dictionary_name)
    item = session.get(model, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    if is_dictionary_item_in_use(dictionary_name, item_id, session):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item is used by a coin",
        )

    session.delete(item)
    session.commit()
