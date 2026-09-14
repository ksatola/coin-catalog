from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Category, Coin, Country, Denomination, Era
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
def coin(session: Session) -> Coin:
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([country, denomination, era])
    session.commit()

    value = Coin(
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


def test_category_graph_supports_multiple_parents(client: TestClient) -> None:
    first = client.post("/categories", json={"name": "First"}).json()
    second = client.post("/categories", json={"name": "Second"}).json()
    child = client.post("/categories", json={"name": "Child"}).json()

    response = client.post(f"/categories/{child['id']}/parents/{first['id']}")
    assert response.status_code == 200
    response = client.post(f"/categories/{child['id']}/parents/{second['id']}")
    assert response.status_code == 200

    response = client.get(f"/categories/{child['id']}")
    assert response.status_code == 200
    assert response.json()["parent_ids"] == sorted([first["id"], second["id"]])


def test_category_graph_rejects_cycle(client: TestClient) -> None:
    first = client.post("/categories", json={"name": "First"}).json()
    second = client.post("/categories", json={"name": "Second"}).json()
    third = client.post("/categories", json={"name": "Third"}).json()

    assert client.post(f"/categories/{second['id']}/parents/{first['id']}").status_code == 200
    assert client.post(f"/categories/{third['id']}/parents/{second['id']}").status_code == 200

    response = client.post(f"/categories/{first['id']}/parents/{third['id']}")
    assert response.status_code == 409
    assert response.json()["detail"] == "Category relation would create a cycle"


def test_coin_can_have_multiple_categories(
    client: TestClient,
    coin: Coin,
) -> None:
    first = client.post("/categories", json={"name": "First"}).json()
    second = client.post("/categories", json={"name": "Second"}).json()

    response = client.post(f"/coins/{coin.id}/categories/{first['id']}")
    assert response.status_code == 200
    response = client.post(f"/coins/{coin.id}/categories/{second['id']}")
    assert response.status_code == 200

    response = client.get(f"/coins/{coin.id}/categories")
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == sorted(
        [first["id"], second["id"]]
    )


def test_image_upload_uses_six_digit_filename(
    client: TestClient,
    coin: Coin,
    tmp_path,
) -> None:
    images.IMAGES_DIR = tmp_path

    response = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "additional"},
        files={"upload": ("source.jpg", b"jpg-data", "image/jpeg")},
    )

    assert response.status_code == 201
    assert response.json()["filename"] == f"{coin.id:06d} - 01.jpg"
    assert (tmp_path / f"{coin.id:06d} - 01.jpg").read_bytes() == b"jpg-data"


def test_primary_image_requires_explicit_replace(
    client: TestClient,
    coin: Coin,
    tmp_path,
) -> None:
    images.IMAGES_DIR = tmp_path

    first = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", b"first", "image/jpeg")},
    )
    assert first.status_code == 201

    second = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers"},
        files={"upload": ("source.jpg", b"second", "image/jpeg")},
    )
    assert second.status_code == 409

    replacement = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": "avers", "replace": True},
        files={"upload": ("source.jpg", b"second", "image/jpeg")},
    )
    assert replacement.status_code == 200
    assert (tmp_path / f"{coin.id:06d} - avers.jpg").read_bytes() == b"second"


@pytest.mark.parametrize("kind", ["avers", "rewers"])
def test_primary_image_cannot_be_deleted(
    client: TestClient,
    coin: Coin,
    kind: str,
    tmp_path,
) -> None:
    images.IMAGES_DIR = tmp_path
    created = client.post(
        f"/coins/{coin.id}/images",
        params={"kind": kind},
        files={"upload": ("source.jpg", b"data", "image/jpeg")},
    )
    assert created.status_code == 201

    response = client.delete(f"/coins/{coin.id}/images/{created.json()['id']}")
    assert response.status_code == 409


def test_category_delete_is_blocked_when_attached_to_coin(
    client: TestClient,
    session: Session,
    coin: Coin,
) -> None:
    category = Category(name="Used")
    session.add(category)
    session.commit()

    coin.categories.append(category)
    session.commit()

    response = client.delete(f"/categories/{category.id}")
    assert response.status_code == 409
    assert response.json()["detail"] == "Category is in use"
