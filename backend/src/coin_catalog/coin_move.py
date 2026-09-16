from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from coin_catalog.models import Coin, CoinImage, Collection
from coin_catalog.routes.images import collection_images_dir


PRIMARY_KINDS = {"avers", "rewers"}


def moved_image_filename(coin_id: int, image: CoinImage) -> str:
    if image.kind in PRIMARY_KINDS:
        return f"{coin_id:06d} - {image.kind}.jpg"
    return f"{coin_id:06d} - {image.sort_order - 1:02d}.jpg"


def _copy_to_target(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    if not target.exists():
        raise OSError(f"Target file was not created: {target}")


def _restore_source(source: Path, target: Path) -> None:
    if target.exists():
        source.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, source)
        target.unlink()


def move_coin(
    coin_id: int,
    target_collection_id: int,
    session: Session,
) -> Coin:
    source_coin = session.get(Coin, coin_id)
    if source_coin is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Coin not found",
        )

    target_collection = session.get(Collection, target_collection_id)
    if target_collection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection not found",
        )

    if source_coin.collection_id == target_collection_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coin already belongs to this collection",
        )

    source_dir = collection_images_dir(source_coin.collection_id)
    target_dir = collection_images_dir(target_collection_id)
    image_moves: list[tuple[Path, Path]] = []

    for image in source_coin.images:
        source = source_dir / image.filename
        if not source.exists():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Image file not found: {image.filename}",
            )

        target = target_dir / moved_image_filename(coin_id + 1, image)
        image_moves.append((source, target))

    try:
        target_dir.mkdir(parents=True, exist_ok=True)
        for _, target in image_moves:
            if target.exists():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Image already exists: {target.name}",
                )

        new_coin = Coin(
            collection_id=target_collection_id,
            collection_number=source_coin.collection_number,
            is_deleted=source_coin.is_deleted,
            country_id=source_coin.country_id,
            issuer_id=source_coin.issuer_id,
            denomination_id=source_coin.denomination_id,
            from_year=source_coin.from_year,
            from_era_id=source_coin.from_era_id,
            to_year=source_coin.to_year,
            to_era_id=source_coin.to_era_id,
            mint_id=source_coin.mint_id,
            material_id=source_coin.material_id,
            state_id=source_coin.state_id,
            description=source_coin.description,
            weight=source_coin.weight,
            diameter=source_coin.diameter,
            has_video=source_coin.has_video,
            source=source_coin.source,
            created_at=source_coin.created_at,
            updated_at=source_coin.updated_at,
            categories=list(source_coin.categories),
        )
        session.add(new_coin)
        session.flush()

        image_moves = [
            (source, target_dir / moved_image_filename(new_coin.id, image))
            for image, (source, _) in zip(source_coin.images, image_moves, strict=True)
        ]
        for _, target in image_moves:
            if target.exists():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Image already exists: {target.name}",
                )

        for source, target in image_moves:
            temp_target = target.with_name(f".{target.name}.{uuid4().hex}.tmp")
            _copy_to_target(source, temp_target)
            temp_target.replace(target)

        new_coin.images = [
            CoinImage(
                filename=target.name,
                kind=image.kind,
                sort_order=image.sort_order,
            )
            for image, (_, target) in zip(source_coin.images, image_moves, strict=True)
        ]
        session.flush()

        for source, _ in image_moves:
            source.unlink()

        session.delete(source_coin)
        session.commit()
        session.refresh(new_coin)
        return new_coin
    except HTTPException:
        session.rollback()
        for _, target in image_moves:
            if target.exists():
                _restore_source(
                    source=next(
                        source for source, candidate in image_moves if candidate == target
                    ),
                    target=target,
                )
        raise
    except Exception:
        session.rollback()
        for source, target in image_moves:
            if target.exists():
                _restore_source(source, target)
        raise
