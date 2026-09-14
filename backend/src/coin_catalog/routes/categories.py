from collections import deque

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import get_db
from coin_catalog.models import Category, CategoryRelation, Coin
from coin_catalog.schemas import CategoryCreate, CategoryGraphItem, CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


def get_category(category_id: int, session: Session) -> Category:
    category = session.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    return category


def graph_item(category: Category) -> CategoryGraphItem:
    return CategoryGraphItem(
        id=category.id,
        name=category.name,
        description=category.description,
        created_at=category.created_at,
        updated_at=category.updated_at,
        parent_ids=sorted(parent.id for parent in category.parents),
        child_ids=sorted(child.id for child in category.children),
    )


def would_create_cycle(parent_id: int, child_id: int, session: Session) -> bool:
    if parent_id == child_id:
        return True

    queue: deque[int] = deque([child_id])
    visited: set[int] = set()

    while queue:
        current_id = queue.popleft()
        if current_id in visited:
            continue
        visited.add(current_id)

        child_ids = session.scalars(
            select(CategoryRelation.child_id).where(
                CategoryRelation.parent_id == current_id,
            )
        ).all()
        for next_id in child_ids:
            if next_id == parent_id:
                return True
            queue.append(next_id)

    return False


@router.get("", response_model=list[CategoryGraphItem])
def list_categories(session: Session = Depends(get_db)) -> list[CategoryGraphItem]:
    categories = session.scalars(select(Category).order_by(Category.name)).all()
    return [graph_item(category) for category in categories]


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    category_data: CategoryCreate,
    session: Session = Depends(get_db),
) -> Category:
    name = category_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    category = Category(name=name, description=category_data.description)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    session: Session = Depends(get_db),
) -> Category:
    category = get_category(category_id, session)
    name = category_data.name.strip()
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name cannot be empty",
        )

    category.name = name
    category.description = category_data.description
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, session: Session = Depends(get_db)) -> None:
    category = get_category(category_id, session)

    coin_usage = session.scalar(
        select(Coin.id)
        .join(Coin.categories)
        .where(Category.id == category_id)
        .limit(1)
    )
    relation_usage = session.scalar(
        select(CategoryRelation.parent_id)
        .where(
            (CategoryRelation.parent_id == category_id)
            | (CategoryRelation.child_id == category_id),
        )
        .limit(1)
    )

    if coin_usage is not None or relation_usage is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category is in use",
        )

    session.delete(category)
    session.commit()


@router.get("/{category_id}", response_model=CategoryGraphItem)
def get_category_details(
    category_id: int,
    session: Session = Depends(get_db),
) -> CategoryGraphItem:
    return graph_item(get_category(category_id, session))


@router.post("/{category_id}/parents/{parent_id}", response_model=CategoryGraphItem)
def add_parent_category(
    category_id: int,
    parent_id: int,
    session: Session = Depends(get_db),
) -> CategoryGraphItem:
    child = get_category(category_id, session)
    parent = get_category(parent_id, session)

    if would_create_cycle(parent.id, child.id, session):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Category relation would create a cycle",
        )

    existing = session.scalar(
        select(CategoryRelation).where(
            CategoryRelation.parent_id == parent.id,
            CategoryRelation.child_id == child.id,
        )
    )
    if existing is not None:
        return graph_item(child)

    session.add(CategoryRelation(parent_id=parent.id, child_id=child.id))
    session.commit()
    session.refresh(child)
    return graph_item(child)


@router.delete("/{category_id}/parents/{parent_id}", response_model=CategoryGraphItem)
def remove_parent_category(
    category_id: int,
    parent_id: int,
    session: Session = Depends(get_db),
) -> CategoryGraphItem:
    child = get_category(category_id, session)
    relation = session.scalar(
        select(CategoryRelation).where(
            CategoryRelation.parent_id == parent_id,
            CategoryRelation.child_id == category_id,
        )
    )

    if relation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category relation not found",
        )

    session.delete(relation)
    session.commit()
    session.refresh(child)
    return graph_item(child)


@router.get("/{category_id}/children", response_model=list[CategoryResponse])
def list_children(
    category_id: int,
    session: Session = Depends(get_db),
) -> list[CategoryResponse]:
    category = get_category(category_id, session)
    return [
        CategoryResponse.model_validate(child)
        for child in sorted(category.children, key=lambda item: item.name)
    ]


@router.get("/{category_id}/parents", response_model=list[CategoryResponse])
def list_parents(
    category_id: int,
    session: Session = Depends(get_db),
) -> list[CategoryResponse]:
    category = get_category(category_id, session)
    return [
        CategoryResponse.model_validate(parent)
        for parent in sorted(category.parents, key=lambda item: item.name)
    ]
