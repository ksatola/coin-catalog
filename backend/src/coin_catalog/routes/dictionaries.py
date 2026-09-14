from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import get_db
from coin_catalog.models import (
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


def get_dictionary_model(dictionary_name: str):
    model = DICTIONARIES.get(dictionary_name)
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dictionary not found",
        )
    return model


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
