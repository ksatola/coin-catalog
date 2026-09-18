from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
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


@pytest.fixture
def reference_data(session: Session) -> dict[str, int]:
    source_collection = Collection(name="Source Collection")
    target_collection = Collection(name="Target Collection")
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    category = Category(name="Test Category")

    session.add_all(
        [
            source_collection,
            target_collection,
            country,
            denomination,
            era,
            category,
        ],
    )
    session.commit()

    return {
        "source_collection_id": source_collection.id,
        "target_collection_id": target_collection.id,
        "country_id": country.id,
        "denomination_id": denomination.id,
        "era_id": era.id,
        "category_id": category.id,
    }


def create_coin(
    session: Session,
    reference_data: dict[str, int],
    *,
    collection_number: str = "KC-001",
) -> Coin:
    coin = Coin(
        collection_id=reference_data["source_collection_id"],
        collection_number=collection_number,
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
        description="Coin to move",
    )
    category = session.get(Category, reference_data["category_id"])
    assert category is not None
    coin.categories.append(category)
    session.add(coin)
    session.commit()
    session.refresh(coin)
    return coin


def create_image(
    session: Session,
    image_dir: Path,
    coin: Coin,
    *,
    kind: str,
    sort_order: int,
    content: bytes,
) -> CoinImage:
    filename = (
        f"{coin.id:06d} - {kind}.jpg"
        if kind in {"avers", "rewers"}
        else f"{coin.id:06d} - {sort_order - 1:02d}.jpg"
    )
    directory = image_dir / f"collection-{coin.collection_id:03d}"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / filename).write_bytes(content)

    image = CoinImage(
        coin_id=coin.id,
        filename=filename,
        kind=kind,
        sort_order=sort_order,
        file_size_bytes=len(content),
    )
    session.add(image)
    session.commit()
    session.refresh(image)
    return image


def test_move_coin_recreates_coin_images_and_preserves_data(
    client: TestClient,
    session: Session,
    image_dir: Path,
    reference_data: dict[str, int],
) -> None:
    coin = create_coin(session, reference_data)
    create_image(
        session,
        image_dir,
        coin,
        kind="avers",
        sort_order=0,
        content=b"avers-data",
    )
    create_image(
        session,
        image_dir,
        coin,
        kind="rewers",
        sort_order=1,
        content=b"rewers-data",
    )
    create_image(
        session,
        image_dir,
        coin,
        kind="additional",
        sort_order=2,
        content=b"additional-data",
    )

    source_collection = session.get(
        Collection,
        reference_data["source_collection_id"],
    )
    target_collection = session.get(
        Collection,
        reference_data["target_collection_id"],
    )
    assert source_collection is not None
    assert target_collection is not None
    recalculate_collection_stats(source_collection, session)
    recalculate_collection_stats(target_collection, session)
    session.commit()

    old_id = coin.id
    source_dir = image_dir / f"collection-{coin.collection_id:03d}"

    response = client.post(
        f"/coins/{old_id}/move",
        json={"target_collection_id": reference_data["target_collection_id"]},
    )

    assert response.status_code == 200
    moved = response.json()
    assert moved["id"] != old_id
    assert moved["collection_id"] == reference_data["target_collection_id"]
    assert moved["collection_number"] == "KC-001"
    assert moved["description"] == "Coin to move"

    new_id = moved["id"]
    target_dir = image_dir / f"collection-{reference_data['target_collection_id']:03d}"
    assert (target_dir / f"{new_id:06d} - avers.jpg").read_bytes() == b"avers-data"
    assert (target_dir / f"{new_id:06d} - rewers.jpg").read_bytes() == b"rewers-data"
    assert (target_dir / f"{new_id:06d} - 01.jpg").read_bytes() == b"additional-data"
    assert list(source_dir.glob("*.jpg")) == []

    assert session.get(Coin, old_id) is None
    moved_coin = session.get(Coin, new_id)
    assert moved_coin is not None
    assert [category.id for category in moved_coin.categories] == [
        reference_data["category_id"],
    ]
    assert [image.filename for image in moved_coin.images] == [
        f"{new_id:06d} - avers.jpg",
        f"{new_id:06d} - rewers.jpg",
        f"{new_id:06d} - 01.jpg",
    ]
    assert session.scalar(select(func.count()).select_from(CoinImage)) == 3

    session.refresh(source_collection)
    session.refresh(target_collection)
    assert source_collection.coin_count == 0
    assert source_collection.image_count == 0
    assert source_collection.file_size_bytes == 0
    assert source_collection.category_count == 0
    assert source_collection.coins_without_images_count == 0
    assert target_collection.coin_count == 1
    assert target_collection.image_count == 3
    assert target_collection.file_size_bytes == len(b"avers-data") + len(
        b"rewers-data"
    ) + len(b"additional-data")
    assert target_collection.category_count == 1
    assert target_collection.coins_without_images_count == 0


def test_move_coin_without_images_updates_only_database(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = create_coin(session, reference_data)

    response = client.post(
        f"/coins/{coin.id}/move",
        json={"target_collection_id": reference_data["target_collection_id"]},
    )

    assert response.status_code == 200
    moved = response.json()
    assert moved["id"] != coin.id
    assert moved["collection_id"] == reference_data["target_collection_id"]
    assert session.get(Coin, coin.id) is None

    source = session.get(Collection, reference_data["source_collection_id"])
    target = session.get(Collection, reference_data["target_collection_id"])
    assert source is not None
    assert target is not None
    assert source.coin_count == 0
    assert target.coin_count == 1
    assert target.image_count == 0
    assert target.coins_without_images_count == 1
    assert target.category_count == 1


def test_move_coin_rejects_target_filename_collision(
    client: TestClient,
    session: Session,
    image_dir: Path,
    reference_data: dict[str, int],
) -> None:
    coin = create_coin(session, reference_data)
    create_image(
        session,
        image_dir,
        coin,
        kind="avers",
        sort_order=0,
        content=b"avers-data",
    )

    next_id = (session.scalar(select(func.max(Coin.id))) or 0) + 1
    target_dir = image_dir / f"collection-{reference_data['target_collection_id']:03d}"
    target_dir.mkdir(parents=True, exist_ok=True)
    collision = target_dir / f"{next_id:06d} - avers.jpg"
    collision.write_bytes(b"existing")

    response = client.post(
        f"/coins/{coin.id}/move",
        json={"target_collection_id": reference_data["target_collection_id"]},
    )

    assert response.status_code == 409
    assert "Image already exists" in response.json()["detail"]
    assert session.get(Coin, coin.id) is not None
    assert collision.read_bytes() == b"existing"

    source_file = (
        image_dir / f"collection-{coin.collection_id:03d}" / coin.images[0].filename
    )
    assert source_file.read_bytes() == b"avers-data"


def test_move_coin_rolls_back_database_and_filesystem_on_copy_failure(
    client: TestClient,
    session: Session,
    image_dir: Path,
    reference_data: dict[str, int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    coin = create_coin(session, reference_data)
    create_image(
        session,
        image_dir,
        coin,
        kind="avers",
        sort_order=0,
        content=b"avers-data",
    )
    create_image(
        session,
        image_dir,
        coin,
        kind="rewers",
        sort_order=1,
        content=b"rewers-data",
    )

    source_collection = session.get(
        Collection,
        reference_data["source_collection_id"],
    )
    target_collection = session.get(
        Collection,
        reference_data["target_collection_id"],
    )
    assert source_collection is not None
    assert target_collection is not None
    recalculate_collection_stats(source_collection, session)
    recalculate_collection_stats(target_collection, session)
    session.commit()
    original_stats = (
        source_collection.coin_count,
        source_collection.image_count,
        source_collection.file_size_bytes,
        source_collection.category_count,
        source_collection.coins_without_images_count,
        target_collection.coin_count,
        target_collection.image_count,
        target_collection.file_size_bytes,
        target_collection.category_count,
        target_collection.coins_without_images_count,
    )

    original_copy2 = coin_move.shutil.copy2
    calls = 0

    def failing_copy2(source: str | Path, target: str | Path) -> str:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("simulated copy failure")
        return str(original_copy2(source, target))

    monkeypatch.setattr(coin_move.shutil, "copy2", failing_copy2)

    with pytest.raises(OSError, match="simulated copy failure"):
        client.post(
            f"/coins/{coin.id}/move",
            json={"target_collection_id": reference_data["target_collection_id"]},
        )

    assert session.get(Coin, coin.id) is not None
    assert session.scalar(select(func.count()).select_from(Coin)) == 1

    session.refresh(source_collection)
    session.refresh(target_collection)
    assert (
        source_collection.coin_count,
        source_collection.image_count,
        source_collection.file_size_bytes,
        source_collection.category_count,
        source_collection.coins_without_images_count,
        target_collection.coin_count,
        target_collection.image_count,
        target_collection.file_size_bytes,
        target_collection.category_count,
        target_collection.coins_without_images_count,
    ) == original_stats

    source_dir = image_dir / f"collection-{coin.collection_id:03d}"
    assert (source_dir / f"{coin.id:06d} - avers.jpg").read_bytes() == b"avers-data"
    assert (source_dir / f"{coin.id:06d} - rewers.jpg").read_bytes() == b"rewers-data"

    target_dir = image_dir / f"collection-{reference_data['target_collection_id']:03d}"
    assert list(target_dir.glob("*.jpg")) == []
    assert list(target_dir.glob(".*.tmp")) == []


def test_move_coin_validates_collection(
    client: TestClient,
    reference_data: dict[str, int],
) -> None:
    response = client.post(
        "/coins/999999/move",
        json={"target_collection_id": reference_data["target_collection_id"]},
    )
    assert response.status_code == 404


def test_move_coin_rejects_same_collection(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = create_coin(session, reference_data)

    response = client.post(
        f"/coins/{coin.id}/move",
        json={"target_collection_id": reference_data["source_collection_id"]},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Coin already belongs to this collection"
