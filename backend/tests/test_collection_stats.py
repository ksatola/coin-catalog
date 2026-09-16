from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Category, Collection, Country, Denomination, Era
from coin_catalog.routes import images


def make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def setup_coin(session: Session, client: TestClient) -> tuple[Collection, int]:
    collection = Collection(name="Stats Collection")
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([collection, country, denomination, era])
    session.commit()

    response = client.post(
        "/coins",
        json={
            "collection_id": collection.id,
            "country_id": country.id,
            "denomination_id": denomination.id,
            "from_year": 1900,
            "from_era_id": era.id,
            "to_year": 1900,
            "to_era_id": era.id,
        },
    )
    assert response.status_code == 201
    return collection, response.json()["id"]


def test_collection_stats_follow_coin_image_and_category_changes(
    tmp_path,
    monkeypatch,
) -> None:
    session = make_session()

    def override_get_db() -> Generator[Session]:
        yield session

    app.dependency_overrides[get_db] = override_get_db
    image_dir = tmp_path / "images"
    image_dir.mkdir()
    monkeypatch.setattr(images, "IMAGES_DIR", image_dir)

    try:
        client = TestClient(app)
        collection, coin_id = setup_coin(session, client)

        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["coin_count"] == 1
        assert stats["archived_coin_count"] == 0
        assert stats["image_count"] == 0
        assert stats["file_size_bytes"] == 0
        assert stats["category_count"] == 0
        assert stats["coins_without_images_count"] == 1

        category = client.post("/categories", json={"name": "Silver"}).json()
        response = client.post(f"/coins/{coin_id}/categories/{category['id']}")
        assert response.status_code == 200

        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["category_count"] == 1

        response = client.post(
            f"/coins/{coin_id}/images",
            params={"kind": "avers"},
            files={"upload": ("avers.jpg", b"12345", "image/jpeg")},
        )
        assert response.status_code == 201
        assert response.json()["file_size_bytes"] == 5

        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["image_count"] == 1
        assert stats["file_size_bytes"] == 5
        assert stats["coins_without_images_count"] == 0

        image_id = response.json()["id"]
        response = client.delete(f"/coins/{coin_id}/images/{image_id}")
        assert response.status_code == 409

        replacement = client.post(
            f"/coins/{coin_id}/images",
            params={"kind": "avers", "replace": True},
            files={"upload": ("avers.jpg", b"123456789", "image/jpeg")},
        )
        assert replacement.status_code == 200
        assert replacement.json()["file_size_bytes"] == 9

        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["image_count"] == 1
        assert stats["file_size_bytes"] == 9

        response = client.delete(f"/coins/{coin_id}/categories/{category['id']}")
        assert response.status_code == 204
        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["category_count"] == 0

        response = client.post(f"/coins/{coin_id}/archive")
        assert response.status_code == 200
        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["coin_count"] == 1
        assert stats["archived_coin_count"] == 1

        response = client.post(f"/coins/{coin_id}/restore")
        assert response.status_code == 200
        stats = client.get(f"/collections/{collection.id}/stats").json()
        assert stats["coin_count"] == 1
        assert stats["archived_coin_count"] == 0
    finally:
        app.dependency_overrides.clear()
        session.close()
