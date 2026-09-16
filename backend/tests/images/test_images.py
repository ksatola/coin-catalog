from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, Collection, Country, Denomination, Era
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
def coin(session: Session) -> Coin:
    collection = Collection(name="Test Collection")
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
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


@pytest.fixture
def second_coin(session: Session) -> Coin:
    collection = Collection(name="Second Collection")
    country = Country(name="Second Country")
    denomination = Denomination(name="Second Denomination")
    era = Era(name="Second Era")

    session.add_all([collection, country, denomination, era])
    session.commit()

    value = Coin(
        collection_id=collection.id,
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1901,
        from_era_id=era.id,
        to_year=1901,
        to_era_id=era.id,
    )
    session.add(value)
    session.commit()
    session.refresh(value)
    return value


def upload_image(
    client: TestClient,
    coin_id: int,
    kind: str,
    content: bytes,
    filename: str = "source.jpg",
    replace: bool = False,
):
    return client.post(
        f"/coins/{coin_id}/images",
        params={"kind": kind, "replace": replace},
        files={"upload": (filename, content, "image/jpeg")},
    )


def test_upload_primary_images(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    avers = upload_image(client, coin.id, "avers", b"avers-data")
    rewers = upload_image(client, coin.id, "rewers", b"rewers-data")

    assert avers.status_code == 201
    assert rewers.status_code == 201

    assert avers.json()["filename"] == f"{coin.id:06d} - avers.jpg"
    assert rewers.json()["filename"] == f"{coin.id:06d} - rewers.jpg"

    assert (image_dir / f"{coin.id:06d} - avers.jpg").read_bytes() == b"avers-data"
    assert (image_dir / f"{coin.id:06d} - rewers.jpg").read_bytes() == b"rewers-data"


def test_upload_additional_images_are_numbered(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    first = upload_image(client, coin.id, "additional", b"first")
    second = upload_image(client, coin.id, "additional", b"second")
    third = upload_image(client, coin.id, "additional", b"third")

    assert first.status_code == 201
    assert second.status_code == 201
    assert third.status_code == 201

    assert first.json()["filename"] == f"{coin.id:06d} - 01.jpg"
    assert second.json()["filename"] == f"{coin.id:06d} - 02.jpg"
    assert third.json()["filename"] == f"{coin.id:06d} - 03.jpg"

    assert (image_dir / f"{coin.id:06d} - 01.jpg").read_bytes() == b"first"
    assert (image_dir / f"{coin.id:06d} - 02.jpg").read_bytes() == b"second"
    assert (image_dir / f"{coin.id:06d} - 03.jpg").read_bytes() == b"third"


def test_list_images_returns_sort_order(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    upload_image(client, coin.id, "additional", b"additional")
    upload_image(client, coin.id, "rewers", b"rewers")
    upload_image(client, coin.id, "avers", b"avers")

    response = client.get(f"/coins/{coin.id}/images")

    assert response.status_code == 200
    assert [image["kind"] for image in response.json()] == [
        "avers",
        "rewers",
        "additional",
    ]


def test_get_image_file_returns_file(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    created = upload_image(client, coin.id, "additional", b"image-data")
    image_id = created.json()["id"]

    response = client.get(f"/coins/{coin.id}/images/{image_id}/file")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/jpeg")
    assert response.content == b"image-data"


def test_get_image_file_returns_404_when_file_is_missing(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    created = upload_image(client, coin.id, "additional", b"image-data")
    image_id = created.json()["id"]

    (image_dir / created.json()["filename"]).unlink()

    response = client.get(f"/coins/{coin.id}/images/{image_id}/file")

    assert response.status_code == 404
    assert response.json()["detail"] == "Image file not found"


def test_image_cannot_be_fetched_through_another_coin(
    client: TestClient,
    coin: Coin,
    second_coin: Coin,
    image_dir: Path,
) -> None:
    created = upload_image(client, coin.id, "additional", b"image-data")
    image_id = created.json()["id"]

    response = client.get(
        f"/coins/{second_coin.id}/images/{image_id}/file",
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Image not found"


def test_delete_additional_image_removes_database_row_and_file(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    created = upload_image(client, coin.id, "additional", b"image-data")
    image_id = created.json()["id"]
    filename = created.json()["filename"]

    response = client.delete(f"/coins/{coin.id}/images/{image_id}")

    assert response.status_code == 204
    assert not (image_dir / filename).exists()

    listed = client.get(f"/coins/{coin.id}/images")
    assert listed.status_code == 200
    assert listed.json() == []


@pytest.mark.parametrize("kind", ["avers", "rewers"])
def test_primary_image_cannot_be_deleted(
    client: TestClient,
    coin: Coin,
    kind: str,
    image_dir: Path,
) -> None:
    created = upload_image(client, coin.id, kind, b"image-data")

    response = client.delete(
        f"/coins/{coin.id}/images/{created.json()['id']}",
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Primary image must be replaced rather than deleted"
    )


@pytest.mark.parametrize("kind", ["avers", "rewers"])
def test_primary_image_requires_explicit_replacement(
    client: TestClient,
    coin: Coin,
    kind: str,
    image_dir: Path,
) -> None:
    first = upload_image(client, coin.id, kind, b"first")
    assert first.status_code == 201

    second = upload_image(client, coin.id, kind, b"second")
    assert second.status_code == 409

    replacement = upload_image(
        client,
        coin.id,
        kind,
        b"second",
        replace=True,
    )

    assert replacement.status_code == 200
    assert (image_dir / f"{coin.id:06d} - {kind}.jpg").read_bytes() == b"second"


def test_invalid_image_format_is_rejected(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    response = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "additional"},
        files={"upload": ("source.png", b"not-jpg", "image/png")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only JPG images are supported"
    assert list(image_dir.iterdir()) == []


def test_existing_additional_filename_cannot_be_overwritten(
    client: TestClient,
    coin: Coin,
    image_dir: Path,
) -> None:
    target = image_dir / f"{coin.id:06d} - 01.jpg"
    target.write_bytes(b"existing")

    response = upload_image(client, coin.id, "additional", b"new")

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Image already exists; explicit replacement is required"
    )
    assert target.read_bytes() == b"existing"


def test_missing_coin_returns_404(
    client: TestClient,
    image_dir: Path,
) -> None:
    response = client.get("/coins/999999/images")

    assert response.status_code == 404
    assert response.json()["detail"] == "Coin not found"
