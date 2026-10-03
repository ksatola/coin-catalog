from __future__ import annotations

import re
import unicodedata
from collections import deque

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.models import StoryPage


def slugify(title: str) -> str:
    value = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or "strona"


def get_page_or_404(page_id: int, session: Session) -> StoryPage:
    page = session.get(StoryPage, page_id)
    if page is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story page not found")
    return page


def siblings_conflict(parent_id, title, slug, session, exclude_id=None) -> bool:
    statement = select(StoryPage.id).where(
        StoryPage.parent_id == parent_id,
        (StoryPage.title == title) | (StoryPage.slug == slug),
    )
    if exclude_id is not None:
        statement = statement.where(StoryPage.id != exclude_id)
    return session.scalar(statement.limit(1)) is not None


def subtree_ids(page_id: int, session: Session) -> set[int]:
    result: set[int] = set()
    queue: deque[int] = deque([page_id])
    while queue:
        current_id = queue.popleft()
        if current_id in result:
            continue
        result.add(current_id)
        queue.extend(
            session.scalars(
                select(StoryPage.id).where(StoryPage.parent_id == current_id)
            ).all()
        )
    return result


def validate_parent_move(page, parent_id, title, slug, session: Session) -> None:
    if parent_id == page.id:
        raise HTTPException(status_code=409, detail="Story page cannot be its own parent")
    if parent_id is not None and session.get(StoryPage, parent_id) is None:
        raise HTTPException(status_code=404, detail="Parent story page not found")
    if parent_id is not None and parent_id in subtree_ids(page.id, session):
        raise HTTPException(status_code=409, detail="Story page cannot be moved inside its own subtree")
    if siblings_conflict(parent_id, title, slug, session, page.id):
        raise HTTPException(
            status_code=409,
            detail="A story page with the same title or slug already exists at the destination",
        )


def normalize_page_fields(title: str, content: str, slug: str | None) -> tuple[str, str]:
    normalized_title = title.strip()
    if not normalized_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    normalized_slug = slugify(normalized_title) if slug is None or not slug.strip() else slugify(slug)
    return normalized_title, normalized_slug


def page_path(page: StoryPage, session: Session) -> str:
    parts = [page.slug]
    current = page
    while current.parent_id is not None:
        current = get_page_or_404(current.parent_id, session)
        parts.append(current.slug)
    return "/".join(reversed(parts))
