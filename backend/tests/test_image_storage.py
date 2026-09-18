from collections.abc import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog import image_storage
from coin_catalog.database import Base
from coin_catalog.image_storage import (
    ensure_image_storage,
    find_image_storage_issues,
)
from coin_catalog.models import Coin, CoinImage, Collection, Country, Denomination, Era


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


def create_coin(session: Session, collection: Collection) -> Coin:
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([country, denomination, era])
    session.flush()

    coin = Coin(
        collection_id=collection.id,
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1900,
        from_era_id=era.id,
        to_year=1900,
        to_era_id=era.id,
    )
    session.add(coin)
    session.flush()
    return coin


def test_ensure_image_storage_creates_missing_collection_directories(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    first = Collection(name="First")
    second = Collection(name="Second")
    session.add_all([first, second])
    session.commit()

    issues = ensure_image_storage(session)

    assert issues == []
    assert (tmp_path / "images").is_dir()
    assert (tmp_path / "images" / f"collection-{first.id:03d}").is_dir()
    assert (tmp_path / "images" / f"collection-{second.id:03d}").is_dir()


def test_missing_referenced_file_is_reported_without_modifying_database(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    collection = Collection(name="Test Collection")
    session.add(collection)
    session.flush()
    coin = create_coin(session, collection)
    image = CoinImage(
        coin_id=coin.id,
        filename=f"{coin.id:06d} - avers.jpg",
        kind="avers",
        sort_order=0,
        file_size_bytes=123,
    )
    session.add(image)
    session.commit()

    issues = find_image_storage_issues(session)

    assert [(issue.kind, issue.detail) for issue in issues] == [
        (
            "missing_file",
            (
                f"coin_image {image.id}: missing file "
                f"{tmp_path / 'images' / f'collection-{collection.id:03d}' / image.filename}"
            ),
        )
    ]
    assert session.get(CoinImage, image.id) is not None


def test_existing_referenced_file_is_consistent(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    collection = Collection(name="Test Collection")
    session.add(collection)
    session.flush()
    coin = create_coin(session, collection)
    image = CoinImage(
        coin_id=coin.id,
        filename=f"{coin.id:06d} - avers.jpg",
        kind="avers",
        sort_order=0,
        file_size_bytes=3,
    )
    session.add(image)
    session.commit()

    image_dir = tmp_path / "images" / f"collection-{collection.id:03d}"
    image_dir.mkdir(parents=True)
    (image_dir / image.filename).write_bytes(b"jpg")

    assert find_image_storage_issues(session) == []


def test_unsafe_image_filename_is_reported(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    collection = Collection(name="Test Collection")
    session.add(collection)
    session.flush()
    coin = create_coin(session, collection)
    session.add(
        CoinImage(
            coin_id=coin.id,
            filename="../outside.jpg",
            kind="avers",
            sort_order=0,
            file_size_bytes=3,
        )
    )
    session.commit()

    issues = find_image_storage_issues(session)

    assert len(issues) == 1
    assert issues[0].kind == "invalid_filename"


def test_ensure_image_storage_is_idempotent(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    collection = Collection(name="Test Collection")
    session.add(collection)
    session.commit()

    assert ensure_image_storage(session) == []
    sentinel = tmp_path / "images" / f"collection-{collection.id:03d}" / "sentinel.txt"
    sentinel.write_text("keep", encoding="utf-8")

    assert ensure_image_storage(session) == []
    assert sentinel.read_text(encoding="utf-8") == "keep"


def test_ensure_image_storage_does_not_remove_orphaned_files_or_directories(
    session: Session,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(image_storage, "IMAGES_DIR", tmp_path / "images")
    orphan_dir = tmp_path / "images" / "collection-999"
    orphan_dir.mkdir(parents=True)
    orphan_file = orphan_dir / "orphan.jpg"
    orphan_file.write_bytes(b"orphan")

    collection = Collection(name="Test Collection")
    session.add(collection)
    session.commit()

    assert ensure_image_storage(session) == []
    assert orphan_dir.is_dir()
    assert orphan_file.read_bytes() == b"orphan"


def test_initialize_database_creates_missing_runtime_data_directories(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from coin_catalog import database

    data_dir = tmp_path / "data"
    images_dir = data_dir / "images"
    monkeypatch.setattr(database, "DATA_DIR", data_dir)
    monkeypatch.setattr(database, "IMAGES_DIR", images_dir)

    database.initialize_database()

    assert data_dir.is_dir()
    assert images_dir.is_dir()
