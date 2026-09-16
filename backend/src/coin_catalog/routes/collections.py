from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import get_db
from coin_catalog.models import Collection, Coin
from coin_catalog.schemas import CollectionCreate, CollectionResponse

router = APIRouter(prefix="/collections", tags=["collections"])


def get_collection(collection_id: int, session: Session) -> Collection:
    collection = session.get(Collection, collection_id)
    if collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )
    return collection


def ensure_unique_name(
    name: str,
    session: Session,
    collection_id: int | None = None,
) -> None:
    statement = select(Collection.id).where(Collection.name == name)
    if collection_id is not None:
        statement = statement.where(Collection.id != collection_id)

    if session.scalar(statement) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Collection name already exists",
        )


@router.get("", response_model=list[CollectionResponse])
def list_collections(
    session: Session = Depends(get_db),
) -> list[Collection]:
    return list(session.scalars(select(Collection).order_by(Collection.name)).all())


@router.post(
    "",
    response_model=CollectionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_collection(
    collection_data: CollectionCreate,
    session: Session = Depends(get_db),
) -> Collection:
    name = collection_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    ensure_unique_name(name, session)
    collection = Collection(name=name, description=collection_data.description)
    session.add(collection)
    session.commit()
    session.refresh(collection)
    return collection


@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection_details(
    collection_id: int,
    session: Session = Depends(get_db),
) -> Collection:
    return get_collection(collection_id, session)


@router.put("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: int,
    collection_data: CollectionCreate,
    session: Session = Depends(get_db),
) -> Collection:
    collection = get_collection(collection_id, session)
    name = collection_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    ensure_unique_name(name, session, collection_id)
    collection.name = name
    collection.description = collection_data.description
    session.commit()
    session.refresh(collection)
    return collection


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: int,
    session: Session = Depends(get_db),
) -> None:
    collection = get_collection(collection_id, session)

    coin_usage = session.scalar(
        select(Coin.id).where(Coin.collection_id == collection_id).limit(1),
    )
    if coin_usage is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Collection contains coins",
        )

    session.delete(collection)
    session.commit()
