from __future__ import annotations

import os
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

THUMBNAIL_MAX_SIZE = 800
THUMBNAIL_JPEG_QUALITY = 90
THUMBNAIL_GENERATOR_VERSION = 1
THUMBNAIL_MAX_GENERATION_ATTEMPTS = 2


class ThumbnailGenerationError(RuntimeError):
    """Raised when a thumbnail cannot be generated after the allowed retries."""


def expected_thumbnail_size(source_path: Path, max_size: int = THUMBNAIL_MAX_SIZE) -> tuple[int, int]:
    with Image.open(source_path) as image:
        oriented = ImageOps.exif_transpose(image)
        width, height = oriented.size

    if width <= 0 or height <= 0:
        raise ValueError("Source image has invalid dimensions")

    scale = min(1.0, max_size / max(width, height))
    return max(1, round(width * scale)), max(1, round(height * scale))


def generate_thumbnail(
    source_path: Path,
    target_path: Path,
    *,
    max_size: int = THUMBNAIL_MAX_SIZE,
    quality: int = THUMBNAIL_JPEG_QUALITY,
) -> tuple[int, int]:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    expected_size = expected_thumbnail_size(source_path, max_size)

    with Image.open(source_path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        with tempfile.NamedTemporaryFile(
            mode="wb",
            suffix=".jpg",
            prefix=".thumbnail-",
            dir=target_path.parent,
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)

        try:
            image.save(
                temporary_path,
                format="JPEG",
                quality=quality,
                optimize=True,
            )
            with Image.open(temporary_path) as generated:
                generated.load()
                if generated.format != "JPEG" or generated.size != expected_size:
                    raise ValueError("Generated thumbnail does not match expected JPG dimensions")
            os.replace(temporary_path, target_path)
        finally:
            temporary_path.unlink(missing_ok=True)

    return expected_size


def is_valid_thumbnail(
    source_path: Path,
    target_path: Path,
    *,
    max_size: int = THUMBNAIL_MAX_SIZE,
) -> bool:
    if not target_path.is_file():
        return False

    try:
        expected_size = expected_thumbnail_size(source_path, max_size)
        with Image.open(target_path) as thumbnail:
            image_format = thumbnail.format
            image_size = thumbnail.size
            thumbnail.verify()
            if image_format != "JPEG" or image_size != expected_size:
                return False
    except (OSError, ValueError):
        return False

    return True


def ensure_thumbnail_file(
    source_path: Path,
    target_path: Path,
    *,
    max_size: int = THUMBNAIL_MAX_SIZE,
    quality: int = THUMBNAIL_JPEG_QUALITY,
) -> tuple[int, int]:
    last_error: Exception | None = None

    for _ in range(THUMBNAIL_MAX_GENERATION_ATTEMPTS):
        try:
            return generate_thumbnail(
                source_path,
                target_path,
                max_size=max_size,
                quality=quality,
            )
        except (OSError, ValueError) as error:
            last_error = error

    raise ThumbnailGenerationError(
        f"Could not generate thumbnail after {THUMBNAIL_MAX_GENERATION_ATTEMPTS} attempts"
    ) from last_error


def thumbnail_metadata_is_current(
    *,
    source_path: Path,
    target_path: Path,
    image_revision: int,
    thumbnail_revision: int | None,
    thumbnail_generator_version: int | None,
) -> bool:
    return (
        thumbnail_revision == image_revision
        and thumbnail_generator_version == THUMBNAIL_GENERATOR_VERSION
        and is_valid_thumbnail(source_path, target_path)
    )
