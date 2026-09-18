from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import DATA_DIR
from coin_catalog.models import CoinImage, Collection

logger = logging.getLogger(__name__)

IMAGES_DIR = DATA_DIR / "images"


@dataclass(frozen=True)
class ImageStorageIssue:
    """Describe a filesystem/database consistency problem."""

    kind: str
    detail: str


def collection_images_dir(collection_id: int) -> Path:
    """Return the filesystem directory for a collection's coin images."""
    return IMAGES_DIR / f"collection-{collection_id:03d}"


def ensure_image_storage_directories(session: Session) -> None:
    """Create the image root and missing collection directories without deleting data."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    collections = session.scalars(select(Collection.id).order_by(Collection.id)).all()
    for collection_id in collections:
        collection_images_dir(collection_id).mkdir(parents=True, exist_ok=True)


def find_image_storage_issues(session: Session) -> list[ImageStorageIssue]:
    """Find database image references whose collection file is missing or misplaced."""
    issues: list[ImageStorageIssue] = []
    images = session.scalars(
        select(CoinImage).join(CoinImage.coin).order_by(CoinImage.id),
    ).all()

    for image in images:
        expected_dir = collection_images_dir(image.coin.collection_id)
        filename = Path(image.filename)
        if filename.name != image.filename:
            issues.append(
                ImageStorageIssue(
                    "invalid_filename",
                    f"coin_image {image.id}: unsafe filename {image.filename!r}",
                )
            )
            continue

        expected_path = expected_dir / image.filename
        if not expected_path.is_file():
            issues.append(
                ImageStorageIssue(
                    "missing_file",
                    f"coin_image {image.id}: missing file {expected_path}",
                )
            )

    return issues


def log_image_storage_issues(issues: list[ImageStorageIssue]) -> None:
    """Report consistency issues without modifying application data."""
    for issue in issues:
        logger.warning(
            "Image storage consistency issue [%s]: %s", issue.kind, issue.detail
        )


def ensure_image_storage(session: Session) -> list[ImageStorageIssue]:
    """Prepare collection image directories and report broken DB/file references."""
    ensure_image_storage_directories(session)
    issues = find_image_storage_issues(session)
    log_image_storage_issues(issues)
    return issues
