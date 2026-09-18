from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import case, distinct, exists, func, select
from sqlalchemy.orm import Session

from coin_catalog.models import Coin, CoinCategory, CoinImage, Collection


def recalculate_collection_stats(
    collection: Collection,
    session: Session,
    *,
    modified_at: datetime | None = None,
) -> Collection:
    """Rebuild a collection's cached statistics from database state."""
    coin_count, archived_coin_count, coins_without_images_count = session.execute(
        select(
            func.count(Coin.id),
            func.coalesce(
                func.sum(case((Coin.is_deleted.is_(True), 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(
                    case(
                        (
                            ~exists(
                                select(CoinImage.id).where(
                                    CoinImage.coin_id == Coin.id,
                                )
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
        ).where(Coin.collection_id == collection.id)
    ).one()

    image_count, file_size_bytes = session.execute(
        select(
            func.count(CoinImage.id),
            func.coalesce(func.sum(CoinImage.file_size_bytes), 0),
        )
        .join(Coin, Coin.id == CoinImage.coin_id)
        .where(Coin.collection_id == collection.id)
    ).one()

    category_count = session.scalar(
        select(func.count(distinct(CoinCategory.category_id)))
        .join(Coin, Coin.id == CoinCategory.coin_id)
        .where(Coin.collection_id == collection.id)
    )

    collection.coin_count = int(coin_count or 0)
    collection.archived_coin_count = int(archived_coin_count or 0)
    collection.coins_without_images_count = int(coins_without_images_count or 0)
    collection.image_count = int(image_count or 0)
    collection.file_size_bytes = int(file_size_bytes or 0)
    collection.category_count = int(category_count or 0)
    collection.last_modified_at = modified_at or datetime.now(UTC)
    return collection
