from collections.abc import Generator
from io import BytesIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, CoinImage, Collection, Country, Denomination, Era
from coin_catalog import image_storage
from coin_catalog.routes import coins as coin_routes
from coin_catalog.routes import images
from coin_catalog.thumbnails import (
    THUMBNAIL_GENERATOR_VERSION,
    THUMBNAIL_JPEG_QUALITY,
    THUMBNAIL_MAX_SIZE,
    ThumbnailGenerationError,
    ensure_thumbnail_file,
    generate_thumbnail,
    is_valid_thumbnail,
)


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
def client(
    session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        yield session

    monkeypatch.setattr(
        coin_routes,
        "SessionLocal",
        sessionmaker(bind=session.get_bind()),
    )
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
    monkeypatch.setattr(image_storage, "IMAGES_DIR", directory)
    return directory


@pytest.fixture
def coin(session: Session) -> Coin:
    collection = Collection(name="Thumbnail Collection")
    country = Country(name="Thumbnail Country")
    denomination = Denomination(name="Thumbnail Denomination")
    era = Era(name="CE")
    session.add_all([collection, country, denomination, era])
    session.commit()

    value = Coin(
        collection_id=collection.id,
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1900,
        from_era_id=era.id,
        to_year=1900,
        to_era_id=era.id,
    )
    session.add(value)
    session.commit()
    session.refresh(value)
    return value


def jpeg_bytes(size: tuple[int, int], color: tuple[int, int, int]) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(
        buffer,
        format="JPEG",
        quality=95,
    )
    return buffer.getvalue()


def image_paths(image_dir: Path, coin: Coin, filename: str) -> tuple[Path, Path]:
    original = image_dir / f"collection-{coin.collection_id:03d}" / filename
    thumbnail = (
        image_dir
        / "thumbnails"
        / f"collection-{coin.collection_id:03d}"
        / filename
    )
    return original, thumbnail


def test_generate_thumbnail_preserves_original_and_aspect_ratio(tmp_path: Path) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source_bytes = jpeg_bytes((1600, 800), (220, 120, 40))
    source.write_bytes(source_bytes)

    result_size = generate_thumbnail(source, target)

    assert result_size == (800, 400)
    assert source.read_bytes() == source_bytes
    assert target.is_file()

    with Image.open(target) as thumbnail:
        assert thumbnail.format == "JPEG"
        assert thumbnail.size == (800, 400)


def test_generate_thumbnail_does_not_upscale_small_source(tmp_path: Path) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source.write_bytes(jpeg_bytes((320, 160), (40, 120, 220)))

    assert generate_thumbnail(source, target) == (320, 160)

    with Image.open(target) as thumbnail:
        assert thumbnail.format == "JPEG"
        assert thumbnail.size == (320, 160)


def test_thumbnail_parameters_are_explicit() -> None:
    assert THUMBNAIL_MAX_SIZE == 800
    assert THUMBNAIL_JPEG_QUALITY == 90
    assert THUMBNAIL_GENERATOR_VERSION == 1


def test_invalid_thumbnail_is_detected(tmp_path: Path) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source.write_bytes(jpeg_bytes((1200, 600), (100, 100, 100)))
    target.write_bytes(b"not-a-jpeg")

    assert is_valid_thumbnail(source, target) is False


def test_missing_thumbnail_is_detected(tmp_path: Path) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source.write_bytes(jpeg_bytes((1200, 600), (100, 100, 100)))

    assert is_valid_thumbnail(source, target) is False


def test_thumbnail_generation_retries_once_after_failure(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source.write_bytes(jpeg_bytes((1200, 600), (100, 100, 100)))

    real_generate = generate_thumbnail
    attempts = 0

    def flaky_generate(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OSError("temporary failure")
        return real_generate(*args, **kwargs)

    monkeypatch.setattr(
        "coin_catalog.thumbnails.generate_thumbnail",
        flaky_generate,
    )

    assert ensure_thumbnail_file(source, target) == (800, 400)
    assert attempts == 2
    assert target.is_file()


def test_thumbnail_generation_raises_after_second_failure(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = tmp_path / "source.jpg"
    target = tmp_path / "thumbnail.jpg"
    source.write_bytes(jpeg_bytes((1200, 600), (100, 100, 100)))

    attempts = 0

    def failing_generate(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        raise OSError("permanent failure")

    monkeypatch.setattr(
        "coin_catalog.thumbnails.generate_thumbnail",
        failing_generate,
    )

    with pytest.raises(ThumbnailGenerationError):
        ensure_thumbnail_file(source, target)

    assert attempts == 2


def test_upload_generates_thumbnail_and_stores_revision_metadata(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
    session: Session,
) -> None:
    response = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", jpeg_bytes((1600, 800), (220, 120, 40)), "image/jpeg")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["revision"] == 1
    assert payload["thumbnail_revision"] == 1
    assert payload["thumbnail_generator_version"] == THUMBNAIL_GENERATOR_VERSION

    original, thumbnail = image_paths(image_dir, coin, payload["filename"])
    assert original.is_file()
    assert thumbnail.is_file()
    assert is_valid_thumbnail(original, thumbnail)

    with Image.open(thumbnail) as generated:
        assert generated.format == "JPEG"
        assert generated.size == (800, 400)

    stored = session.get(CoinImage, payload["id"])
    assert stored is not None
    assert stored.revision == 1
    assert stored.thumbnail_revision == 1


def test_thumbnail_endpoint_regenerates_missing_thumbnail_and_caches_it(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    response = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", jpeg_bytes((1000, 500), (220, 120, 40)), "image/jpeg")},
    )
    payload = response.json()
    _, thumbnail = image_paths(image_dir, coin, payload["filename"])
    thumbnail.unlink()

    response = client.get(
        f"/coins/{coin.id}/images/{payload['id']}/thumbnail?v={payload['revision']}"
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    assert response.headers["content-type"].startswith("image/jpeg")
    assert thumbnail.is_file()


def test_replacing_original_increments_revision_and_regenerates_thumbnail(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    first = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", jpeg_bytes((1200, 600), (220, 120, 40)), "image/jpeg")},
    )
    first_payload = first.json()
    _, thumbnail = image_paths(image_dir, coin, first_payload["filename"])
    first_thumbnail = thumbnail.read_bytes()

    second = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers", "replace": "true"},
        files={"upload": ("source.jpg", jpeg_bytes((1200, 600), (40, 120, 220)), "image/jpeg")},
    )
    second_payload = second.json()

    assert second_payload["revision"] == 2
    assert second_payload["thumbnail_revision"] == 2
    assert second_payload["thumbnail_generator_version"] == THUMBNAIL_GENERATOR_VERSION
    assert thumbnail.read_bytes() != first_thumbnail


def test_catalog_page_schedules_thumbnail_reconciliation(
    session: Session,
    coin: Coin,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    scheduled: list[list[int]] = []

    monkeypatch.setattr(
        coin_routes,
        "reconcile_page_thumbnails",
        lambda coin_ids: scheduled.append(coin_ids),
    )

    from fastapi import BackgroundTasks

    background_tasks = BackgroundTasks()
    response = coin_routes.list_coins(
        limit=50,
        session=session,
        background_tasks=background_tasks,
    )

    assert response.items
    assert response.items[0].id == coin.id
    assert len(background_tasks.tasks) == 1
    assert background_tasks.tasks[0].func is coin_routes.reconcile_page_thumbnails
    assert background_tasks.tasks[0].args == ([coin.id],)
    assert scheduled == []


def test_catalog_page_reconciles_missing_thumbnail_for_current_batch(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
    session: Session,
) -> None:
    created = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", jpeg_bytes((1200, 600), (220, 120, 40)), "image/jpeg")},
    )
    payload = created.json()
    image = session.get(CoinImage, payload["id"])
    assert image is not None

    _, thumbnail = image_paths(image_dir, coin, payload["filename"])
    thumbnail.unlink()
    image.thumbnail_revision = None
    image.thumbnail_generator_version = None
    session.commit()

    response = client.get("/coins", params={"limit": 50})

    assert response.status_code == 200
    assert response.json()["items"][0]["images"][0]["revision"] == image.revision
    assert thumbnail.is_file()

    session.refresh(image)
    assert image.thumbnail_revision == image.revision
    assert image.thumbnail_generator_version == THUMBNAIL_GENERATOR_VERSION


def test_thumbnail_revision_is_not_advanced_when_generation_fails(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "coin_catalog.routes.images.ensure_thumbnail_file",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            ThumbnailGenerationError("failed")
        ),
    )

    response = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", jpeg_bytes((1200, 600), (40, 120, 220)), "image/jpeg")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["revision"] == 1
    assert payload["thumbnail_revision"] is None
    assert payload["thumbnail_generator_version"] is None
