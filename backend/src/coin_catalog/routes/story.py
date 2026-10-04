from __future__ import annotations

import re
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from coin_catalog.database import get_db
from coin_catalog.models import Coin, CoinImage, StoryAsset, StoryPage
from coin_catalog.schemas import (
    CoinListResponse,
    StoryAssetResponse,
    StoryEmbeddedAssetResponse,
    StoryEmbeddedCoinResponse,
    StoryPageCreate,
    StoryPageMoveRequest,
    StoryPageReorderRequest,
    StoryPageResponse,
    StoryPageTreeResponse,
    StoryPageUpdate,
)
from coin_catalog.story import (
    get_page_or_404,
    normalize_page_fields,
    page_path,
    siblings_conflict,
    validate_parent_move,
)

router = APIRouter(prefix="/story/pages", tags=["story"])

COIN_REFERENCE_RE = re.compile(r"\{\{\s*coin:(\d+)\s*\}\}")
IMAGE_REFERENCE_RE = re.compile(r"\{\{\s*image:(\d+)\s*\}\}")


def embedded_coin_ids(content: str) -> list[int]:
    seen: set[int] = set()
    ids: list[int] = []
    for match in COIN_REFERENCE_RE.finditer(content):
        coin_id = int(match.group(1))
        if coin_id not in seen:
            seen.add(coin_id)
            ids.append(coin_id)
    return ids


def load_embedded_coins(
    page: StoryPage, session: Session
) -> list[StoryEmbeddedCoinResponse]:
    ids = embedded_coin_ids(page.content)
    if not ids:
        return []

    coins = session.scalars(
        select(Coin)
        .options(
            selectinload(Coin.images.and_(CoinImage.kind.in_(("avers", "rewers"))))
        )
        .where(Coin.id.in_(ids))
    ).all()
    coins_by_id = {coin.id: coin for coin in coins}

    result: list[StoryEmbeddedCoinResponse] = []
    for coin_id in ids:
        coin = coins_by_id.get(coin_id)
        if coin is None or coin.is_deleted:
            result.append(
                StoryEmbeddedCoinResponse(id=coin_id, coin=None, deleted=True)
            )
            continue
        result.append(
            StoryEmbeddedCoinResponse(
                id=coin_id,
                coin=CoinListResponse.model_validate(coin),
                deleted=False,
            )
        )
    return result


def embedded_asset_ids(content: str) -> list[int]:
    seen: set[int] = set()
    ids: list[int] = []
    for match in IMAGE_REFERENCE_RE.finditer(content):
        asset_id = int(match.group(1))
        if asset_id not in seen:
            seen.add(asset_id)
            ids.append(asset_id)
    return ids


def load_embedded_assets(
    page: StoryPage, session: Session
) -> list[StoryEmbeddedAssetResponse]:
    ids = embedded_asset_ids(page.content)
    if not ids:
        return []

    assets = session.scalars(select(StoryAsset).where(StoryAsset.id.in_(ids))).all()
    assets_by_id = {asset.id: asset for asset in assets}
    return [
        StoryEmbeddedAssetResponse(
            id=asset_id,
            asset=(
                StoryAssetResponse.model_validate(assets_by_id[asset_id])
                if asset_id in assets_by_id
                else None
            ),
        )
        for asset_id in ids
    ]


def response(page: StoryPage, session: Session) -> StoryPageResponse:
    return StoryPageResponse(
        id=page.id,
        parent_id=page.parent_id,
        title=page.title,
        slug=page.slug,
        content=page.content,
        sort_order=page.sort_order,
        created_at=page.created_at,
        updated_at=page.updated_at,
        path=page_path(page, session),
        embedded_coins=load_embedded_coins(page, session),
        embedded_assets=load_embedded_assets(page, session),
    )


def tree_node(page: StoryPage, session: Session) -> StoryPageTreeResponse:
    children = session.scalars(
        select(StoryPage)
        .where(StoryPage.parent_id == page.id)
        .order_by(StoryPage.sort_order, StoryPage.id)
    ).all()
    return StoryPageTreeResponse(
        id=page.id,
        parent_id=page.parent_id,
        title=page.title,
        slug=page.slug,
        sort_order=page.sort_order,
        path=page_path(page, session),
        children=[tree_node(child, session) for child in children],
    )


@router.get("/tree", response_model=list[StoryPageTreeResponse])
def list_story_tree(session: Session = Depends(get_db)) -> list[StoryPageTreeResponse]:
    roots = session.scalars(
        select(StoryPage)
        .where(StoryPage.parent_id.is_(None))
        .order_by(StoryPage.sort_order, StoryPage.id)
    ).all()
    return [tree_node(root, session) for root in roots]


@router.get("/path/{slug_path:path}", response_model=StoryPageResponse)
def get_story_page_by_path(
    slug_path: str, session: Session = Depends(get_db)
) -> StoryPageResponse:
    segments = [segment for segment in slug_path.split("/") if segment]
    if not segments:
        raise HTTPException(status_code=404, detail="Story page not found")

    parent_id: int | None = None
    page: StoryPage | None = None
    for slug in segments:
        page = session.scalar(
            select(StoryPage).where(
                StoryPage.parent_id == parent_id,
                StoryPage.slug == slug,
            )
        )
        if page is None:
            raise HTTPException(status_code=404, detail="Story page not found")
        parent_id = page.id

    if page is None:
        raise HTTPException(status_code=404, detail="Story page not found")

    return response(page, session)


@router.get("/{page_id}", response_model=StoryPageResponse)
def get_story_page(
    page_id: int, session: Session = Depends(get_db)
) -> StoryPageResponse:
    return response(get_page_or_404(page_id, session), session)


@router.post("", response_model=StoryPageResponse, status_code=201)
def create_story_page(
    page_data: StoryPageCreate,
    session: Session = Depends(get_db),
) -> StoryPageResponse:
    title, slug = normalize_page_fields(
        page_data.title, page_data.content, page_data.slug
    )

    if (
        page_data.parent_id is not None
        and session.get(StoryPage, page_data.parent_id) is None
    ):
        raise HTTPException(status_code=404, detail="Parent story page not found")

    if siblings_conflict(page_data.parent_id, title, slug, session):
        raise HTTPException(
            status_code=409,
            detail="A story page with the same title or slug already exists at this level",
        )

    sibling_max = session.scalar(
        select(StoryPage.sort_order)
        .where(StoryPage.parent_id == page_data.parent_id)
        .order_by(StoryPage.sort_order.desc())
        .limit(1)
    )
    now = datetime.now(UTC)
    page = StoryPage(
        parent_id=page_data.parent_id,
        title=title,
        slug=slug,
        content=page_data.content,
        sort_order=(sibling_max + 1) if sibling_max is not None else 0,
        created_at=now,
        updated_at=now,
    )
    session.add(page)
    session.commit()
    session.refresh(page)
    return response(page, session)


@router.put("/{page_id}", response_model=StoryPageResponse)
def update_story_page(
    page_id: int,
    page_data: StoryPageUpdate,
    session: Session = Depends(get_db),
) -> StoryPageResponse:
    page = get_page_or_404(page_id, session)
    title, slug = normalize_page_fields(
        page_data.title, page_data.content, page_data.slug
    )

    validate_parent_move(
        page,
        page_data.parent_id,
        title=title,
        slug=slug,
        session=session,
    )

    page.parent_id = page_data.parent_id
    page.title = title
    page.slug = slug
    page.content = page_data.content
    page.updated_at = datetime.now(UTC)
    session.commit()
    session.refresh(page)
    return response(page, session)


@router.delete("/{page_id}", status_code=204)
def delete_story_page(page_id: int, session: Session = Depends(get_db)) -> None:
    page = get_page_or_404(page_id, session)
    child_id = session.scalar(
        select(StoryPage.id).where(StoryPage.parent_id == page.id).limit(1)
    )
    if child_id is not None:
        raise HTTPException(
            status_code=409, detail="Story page with children cannot be deleted"
        )
    session.delete(page)
    session.commit()


@router.post("/{page_id}/move", response_model=StoryPageResponse)
def move_story_page(
    page_id: int,
    move_data: StoryPageMoveRequest,
    session: Session = Depends(get_db),
) -> StoryPageResponse:
    page = get_page_or_404(page_id, session)
    validate_parent_move(
        page,
        move_data.parent_id,
        title=page.title,
        slug=page.slug,
        session=session,
    )
    sibling_max = session.scalar(
        select(StoryPage.sort_order)
        .where(
            StoryPage.parent_id == move_data.parent_id,
            StoryPage.id != page.id,
        )
        .order_by(StoryPage.sort_order.desc())
        .limit(1)
    )
    page.parent_id = move_data.parent_id
    page.sort_order = (sibling_max + 1) if sibling_max is not None else 0
    page.updated_at = datetime.now(UTC)
    session.commit()
    session.refresh(page)
    return response(page, session)


@router.post("/{page_id}/reorder", response_model=StoryPageResponse)
def reorder_story_page(
    page_id: int,
    reorder_data: StoryPageReorderRequest,
    session: Session = Depends(get_db),
) -> StoryPageResponse:
    page = get_page_or_404(page_id, session)
    siblings = list(
        session.scalars(
            select(StoryPage)
            .where(StoryPage.parent_id == page.parent_id)
            .order_by(StoryPage.sort_order, StoryPage.id)
        ).all()
    )

    if reorder_data.target_id is not None:
        if reorder_data.position not in {"before", "inside", "after"}:
            raise HTTPException(status_code=400, detail="Invalid target position")
        if reorder_data.target_id == page.id:
            return response(page, session)

        target = session.get(StoryPage, reorder_data.target_id)
        if target is None:
            raise HTTPException(status_code=404, detail="Target story page not found")

        destination_parent_id = target.id if reorder_data.position == "inside" else target.parent_id
        validate_parent_move(
            page,
            destination_parent_id,
            title=page.title,
            slug=page.slug,
            session=session,
        )
        siblings = list(
            session.scalars(
                select(StoryPage)
                .where(StoryPage.parent_id == destination_parent_id)
                .order_by(StoryPage.sort_order, StoryPage.id)
            ).all()
        )
        if page in siblings:
            siblings.remove(page)

        if reorder_data.position == "inside":
            insert_at = len(siblings)
        else:
            target_index = siblings.index(target)
            insert_at = target_index if reorder_data.position == "before" else target_index + 1
        siblings.insert(insert_at, page)

        now = datetime.now(UTC)
        page.parent_id = destination_parent_id
        for index, sibling in enumerate(siblings):
            sibling.sort_order = index
            sibling.updated_at = now
        session.commit()
        session.refresh(page)
        return response(page, session)

    if reorder_data.direction not in {"up", "down"}:
        raise HTTPException(status_code=400, detail="Invalid reorder direction")

    index = siblings.index(page)
    target_index = index - 1 if reorder_data.direction == "up" else index + 1
    if target_index < 0 or target_index >= len(siblings):
        return response(page, session)

    other = siblings[target_index]
    page.sort_order, other.sort_order = other.sort_order, page.sort_order
    page.updated_at = datetime.now(UTC)
    other.updated_at = datetime.now(UTC)
    session.commit()
    session.refresh(page)
    return response(page, session)
