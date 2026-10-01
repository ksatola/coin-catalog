from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from coin_catalog.collection_stats import recalculate_collection_stats
from coin_catalog.database import DATA_DIR, get_db
from coin_catalog.models import Coin, CoinImage
from coin_catalog.schemas import CoinImageResponse
from coin_catalog.thumbnails import (
    THUMBNAIL_GENERATOR_VERSION,
    ThumbnailGenerationError,
    ensure_thumbnail_file,
    is_valid_thumbnail,
)

router = APIRouter(prefix="/coins/{coin_id}/images", tags=["images"])

PRIMARY_KINDS = {"avers", "rewers"}
IMAGES_DIR = DATA_DIR / "images"
THUMBNAIL_CACHE_CONTROL = "public, max-age=31536000, immutable"


def collection_images_dir(collection_id: int) -> Path:
    return IMAGES_DIR / f"collection-{collection_id:03d}"


def thumbnail_path(collection_id: int, filename: str) -> Path:
    return IMAGES_DIR / "thumbnails" / f"collection-{collection_id:03d}" / filename


def get_coin(coin_id: int, session: Session) -> Coin:
    coin = session.get(Coin, coin_id)
    if coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )
    return coin


def validate_jpeg(upload: UploadFile) -> None:
    filename = (upload.filename or "").lower()
    content_type = (upload.content_type or "").lower()
    if not filename.endswith(".jpg") or content_type not in {
        "image/jpeg",
        "image/jpg",
        "",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPG images are supported",
        )


def primary_filename(coin_id: int, kind: str) -> str:
    return f"{coin_id:06d} - {kind}.jpg"


def next_additional_order(coin: Coin) -> int:
    used_orders = {
        image.sort_order for image in coin.images if image.kind == "additional"
    }
    order = 2
    while order in used_orders:
        order += 1
    return order


def _thumbnail_is_current(
    image: CoinImage,
    original_path: Path,
    thumbnail_file: Path,
) -> bool:
    return (
        image.thumbnail_revision == image.revision
        and image.thumbnail_generator_version == THUMBNAIL_GENERATOR_VERSION
        and is_valid_thumbnail(original_path, thumbnail_file)
    )


def _generate_thumbnail_if_needed(
    image: CoinImage,
    original_path: Path,
    thumbnail_file: Path,
) -> bool:
    if _thumbnail_is_current(image, original_path, thumbnail_file):
        return False

    ensure_thumbnail_file(original_path, thumbnail_file)
    image.thumbnail_revision = image.revision
    image.thumbnail_generator_version = THUMBNAIL_GENERATOR_VERSION
    return True


@router.get("", response_model=list[CoinImageResponse])
def list_images(
    coin_id: int,
    session: Session = Depends(get_db),
) -> list[CoinImage]:
    coin = get_coin(coin_id, session)
    return sorted(coin.images, key=lambda image: image.sort_order)


@router.get("/{image_id}/file")
def get_image_file(
    coin_id: int,
    image_id: int,
    session: Session = Depends(get_db),
) -> FileResponse:
    coin = get_coin(coin_id, session)
    image = session.scalar(
        select(CoinImage).where(
            CoinImage.id == image_id,
            CoinImage.coin_id == coin_id,
        )
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    target = collection_images_dir(coin.collection_id) / image.filename
    if not target.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found",
        )

    return FileResponse(
        target,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/{image_id}/thumbnail")
def get_image_thumbnail(
    coin_id: int,
    image_id: int,
    session: Session = Depends(get_db),
) -> FileResponse:
    coin = get_coin(coin_id, session)
    image = session.scalar(
        select(CoinImage).where(
            CoinImage.id == image_id,
            CoinImage.coin_id == coin_id,
        )
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )

    original_path = collection_images_dir(coin.collection_id) / image.filename
    if not original_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found",
        )

    thumbnail_file = thumbnail_path(coin.collection_id, image.filename)
    try:
        generated = _generate_thumbnail_if_needed(image, original_path, thumbnail_file)
    except ThumbnailGenerationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nie udało się wygenerować miniaturki zdjęcia. Spróbuj ponownie.",
        ) from error

    if generated:
        session.commit()

    return FileResponse(
        thumbnail_file,
        media_type="image/jpeg",
        headers={"Cache-Control": THUMBNAIL_CACHE_CONTROL},
    )


@router.post("", response_model=CoinImageResponse, status_code=status.HTTP_201_CREATED)
def upload_image(
    coin_id: int,
    response: Response,
    upload: UploadFile = File(...),
    kind: str = Query(..., pattern="^(avers|rewers|additional)$"),
    replace: bool = Query(False),
    session: Session = Depends(get_db),
) -> CoinImage:
    coin = get_coin(coin_id, session)
    validate_jpeg(upload)
    image_dir = collection_images_dir(coin.collection_id)
    image_dir.mkdir(parents=True, exist_ok=True)

    existing: CoinImage | None = None
    if kind in PRIMARY_KINDS:
        existing = session.scalar(
            select(CoinImage).where(
                CoinImage.coin_id == coin_id,
                CoinImage.kind == kind,
            )
        )
        filename = primary_filename(coin_id, kind)
        target = image_dir / filename
        if (existing is not None or target.exists()) and not replace:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Image already exists; explicit replacement is required",
            )
        sort_order = 0 if kind == "avers" else 1
    else:
        sort_order = next_additional_order(coin)
        filename = f"{coin_id:06d} - {sort_order - 1:02d}.jpg"
        target = image_dir / filename
        if target.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Image already exists; explicit replacement is required",
            )

    data = upload.file.read()
    previous_data = target.read_bytes() if target.exists() else None
    target.write_bytes(data)

    thumbnail_file = thumbnail_path(coin.collection_id, filename)
    try:
        if existing is not None:
            existing.filename = filename
            existing.sort_order = sort_order
            existing.file_size_bytes = len(data)
            existing.revision += 1
            existing.thumbnail_revision = None
            existing.thumbnail_generator_version = None
            try:
                _generate_thumbnail_if_needed(existing, target, thumbnail_file)
            except ThumbnailGenerationError:
                thumbnail_file.unlink(missing_ok=True)
            recalculate_collection_stats(coin.collection, session)
            session.commit()
            session.refresh(existing)
            response.status_code = status.HTTP_200_OK
            return existing

        image = CoinImage(
            coin_id=coin_id,
            filename=filename,
            kind=kind,
            sort_order=sort_order,
            file_size_bytes=len(data),
            revision=1,
        )
        session.add(image)
        session.flush()
        try:
            _generate_thumbnail_if_needed(image, target, thumbnail_file)
        except ThumbnailGenerationError:
            thumbnail_file.unlink(missing_ok=True)
        recalculate_collection_stats(coin.collection, session)
        session.commit()
        session.refresh(image)
        return image
    except Exception:
        session.rollback()
        thumbnail_file.unlink(missing_ok=True)
        if previous_data is None:
            target.unlink(missing_ok=True)
        else:
            target.write_bytes(previous_data)
        raise


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(
    coin_id: int,
    image_id: int,
    session: Session = Depends(get_db),
) -> None:
    coin = get_coin(coin_id, session)
    image = session.scalar(
        select(CoinImage).where(
            CoinImage.id == image_id,
            CoinImage.coin_id == coin_id,
        )
    )
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found",
        )
    if image.kind in PRIMARY_KINDS:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Primary image must be replaced rather than deleted",
        )

    target = collection_images_dir(coin.collection_id) / image.filename
    if target.exists():
        target.unlink()
    thumbnail_path(coin.collection_id, image.filename).unlink(missing_ok=True)
    session.delete(image)
    recalculate_collection_stats(coin.collection, session)
    session.commit()
