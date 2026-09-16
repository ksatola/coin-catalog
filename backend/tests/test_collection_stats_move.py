from collections.abc import Generator
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog import coin_move
from coin_catalog.collection_stats import recalculate_collection_stats
from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import (
    Category,
    Coin,
    CoinImage,
    Collection,
    Country,
    Denomination,
    Era,
)
from coin_catalog.routes import images


@pytest.fixture
def session() -> Generator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine)()
    try:
        yield test_session
    finally:
        test_session.close()
        engine.dispose()


@pytest.fixture
def client(session: Session) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def image_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    directory = tmp_path / "images"
    directory.mkdir()
    monkeypatch.setattr(images, "IMAGES_DIR", directory)
    return directory


def test_move_rolls_back_stats_when_stats_update_fails(
    client: TestClient,
    session: Session,
    image_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = Collection(name="Source")
    target = Collection(name="Target")
    country = Country(name="Country")
    denomination = Denomination(name="Denomination")
    era = Era(name="CE")
    category = Category(name="Category")
    session.add_all([source, target, country, denomination, era, category])
    session.commit()

    coin = Coin(
        collection_id=source.id,
        collection_number="KC-001",
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1900,
        from_era_id=era.id,
        to_year=1900,
        to_era_id=era.id,
        categories=[category],
    )
    session.add(coin)
    session.flush()

    filename = f"{coin.id:06d} - avers.jpg"
    source_dir = image_dir / f"collection-{source.id:03d}"
    source_dir.mkdir(parents=True)
    (source_dir / filename).write_bytes(b"avers-data")
    session.add(
        CoinImage(
            coin_id=coin.id,
            filename=filename,
            kind="avers",
            sort_order=0,
            file_size_bytes=len(b"avers-data"),
        )
    )
    recalculate_collection_stats(source, session)
    recalculate_collection_stats(target, session)
    session.commit()

    original_stats = (
        source.coin_count,
        source.image_count,
        source.file_size_bytes,
        source.category_count,
        source.coins_without_images_count,
        target.coin_count,
        target.image_count,
        target.file_size_bytes,
        target.category_count,
        target.coins_without_images_count,
    )

    original_recalculate = coin_move.recalculate_collection_stats
    calls = 0

    def failing_recalculate(
        collection: Collection,
        current_session: Session,
        *,
        modified_at: datetime | None = None,
    ) -> Collection:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise RuntimeError("simulated stats failure")
        return original_recalculate(
            collection,
            current_session,
            modified_at=modified_at,
        )

    monkeypatch.setattr(coin_move, "recalculate_collection_stats", failing_recalculate)

    with pytest.raises(RuntimeError, match="simulated stats failure"):
        client.post(
            f"/coins/{coin.id}/move",
            json={"target_collection_id": target.id},
        )

    assert session.get(Coin, coin.id) is not None
    assert session.scalar(select(CoinImage.id)) is not None

    session.refresh(source)
    session.refresh(target)
    assert (
        source.coin_count,
        source.image_count,
        source.file_size_bytes,
        source.category_count,
        source.coins_without_images_count,
        target.coin_count,
        target.image_count,
        target.file_size_bytes,
        target.category_count,
        target.coins_without_images_count,
    ) == original_stats

    assert (source_dir / filename).read_bytes() == b"avers-data"
    target_dir = image_dir / f"collection-{target.id:03d}"
    assert list(target_dir.glob("*.jpg")) == []
