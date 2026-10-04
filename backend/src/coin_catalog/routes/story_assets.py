from __future__ import annotations

from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.database import DATA_DIR, get_db
from coin_catalog.models import StoryAsset
from coin_catalog.schemas import StoryAssetResponse

router = APIRouter(prefix="/story/assets", tags=["story-assets"])

ASSETS_DIR = DATA_DIR / "story" / "assets"
THUMBNAILS_DIR = ASSETS_DIR / "thumbnails"
THUMBNAIL_SIZE = (800, 800)


def asset_path(asset: StoryAsset) -> Path:
    return ASSETS_DIR / asset.filename


def thumbnail_path(asset: StoryAsset) -> Path:
    return THUMBNAILS_DIR / f"{asset.id}.jpg"


def validate_image(data: bytes, expected_format: str) -> tuple[int, int]:
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != expected_format:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file type does not match the image",
                )
            image.verify()
        with Image.open(BytesIO(data)) as image:
            return image.size
    except UnidentifiedImageError as error:
        raise HTTPException(
            status_code=400, detail="Uploaded file is not a valid image"
        ) from error


def write_thumbnail(data: bytes, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".tmp.jpg")
    try:
        with Image.open(BytesIO(data)) as image:
            image = image.convert("RGB")
            image.thumbnail(THUMBNAIL_SIZE)
            image.save(temporary, format="JPEG", quality=90, optimize=True)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


@router.get("", response_model=list[StoryAssetResponse])
def list_assets(session: Session = Depends(get_db)) -> list[StoryAsset]:
    return list(session.scalars(select(StoryAsset).order_by(StoryAsset.id)).all())


@router.get("/{asset_id}/file")
def get_asset_file(asset_id: int, session: Session = Depends(get_db)) -> FileResponse:
    asset = session.get(StoryAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Story asset not found")
    target = asset_path(asset)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Story asset file not found")
    return FileResponse(
        target, media_type=asset.mime_type, headers={"Cache-Control": "no-store"}
    )


@router.get("/{asset_id}/thumbnail")
def get_asset_thumbnail(
    asset_id: int, session: Session = Depends(get_db)
) -> FileResponse:
    asset = session.get(StoryAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Story asset not found")
    original = asset_path(asset)
    if not original.is_file():
        raise HTTPException(status_code=404, detail="Story asset file not found")
    thumbnail = thumbnail_path(asset)
    if not thumbnail.is_file():
        write_thumbnail(original.read_bytes(), thumbnail)
    return FileResponse(
        thumbnail, media_type="image/jpeg", headers={"Cache-Control": "no-store"}
    )


@router.post("", response_model=StoryAssetResponse, status_code=201)
def upload_asset(
    upload: UploadFile = File(...),
    alt_text: str = Form(""),
    session: Session = Depends(get_db),
) -> StoryAsset:
    filename = (upload.filename or "").strip()
    suffix = Path(filename).suffix.lower()
    content_type = (upload.content_type or "").lower()
    allowed_types = {
        ".jpg": ("JPEG", "image/jpeg"),
        ".jpeg": ("JPEG", "image/jpeg"),
        ".png": ("PNG", "image/png"),
    }
    image_type = allowed_types.get(suffix)
    accepted_content_types = {image_type[1], ""} if image_type else set()
    if image_type and suffix in {".jpg", ".jpeg"}:
        accepted_content_types.add("image/jpg")
    if image_type is None or content_type not in accepted_content_types:
        raise HTTPException(
            status_code=400, detail="Only JPG and PNG images are supported"
        )

    data = upload.file.read()
    image_format, mime_type = image_type
    width, height = validate_image(data, image_format)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

    asset = StoryAsset(
        filename=f"pending{suffix}",
        original_filename=filename,
        mime_type=mime_type,
        file_size_bytes=len(data),
        width=width,
        height=height,
        alt_text=alt_text.strip(),
    )
    session.add(asset)
    session.flush()
    asset.filename = f"{asset.id}{suffix}"
    target = asset_path(asset)
    try:
        target.write_bytes(data)
        write_thumbnail(data, thumbnail_path(asset))
        session.commit()
        session.refresh(asset)
        return asset
    except Exception:
        session.rollback()
        target.unlink(missing_ok=True)
        thumbnail_path(asset).unlink(missing_ok=True)
        raise
