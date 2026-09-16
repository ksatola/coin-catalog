from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, Collection, Country, Denomination, Era


def make_session() -> Generator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def make_client(session: Session) -> Generator[TestClient]:
    def override_get_db() -> Generator[Session]:
        yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


def test_collection_crud() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        response = client.post(
            "/collections",
            json={"name": "  Roman Coins  ", "description": "Ancient Rome"},
        )
        assert response.status_code == 201
        collection_id = response.json()["id"]
        assert response.json()["name"] == "Roman Coins"
        assert response.json()["description"] == "Ancient Rome"

        response = client.get("/collections")
        assert response.status_code == 200
        assert [item["id"] for item in response.json()] == [collection_id]

        response = client.get(f"/collections/{collection_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "Roman Coins"

        response = client.put(
            f"/collections/{collection_id}",
            json={"name": "Updated Roman Coins", "description": None},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Roman Coins"
        assert response.json()["description"] is None

        response = client.delete(f"/collections/{collection_id}")
        assert response.status_code == 204

        response = client.get(f"/collections/{collection_id}")
        assert response.status_code == 404
    finally:
        client.close()
        session.close()


def test_empty_collection_can_be_created_and_deleted() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        response = client.post("/collections", json={"name": "Empty Collection"})
        assert response.status_code == 201
        collection_id = response.json()["id"]

        response = client.delete(f"/collections/{collection_id}")
        assert response.status_code == 204
    finally:
        client.close()
        session.close()


def test_collection_name_must_be_unique() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        response = client.post("/collections", json={"name": "Roman Coins"})
        assert response.status_code == 201

        response = client.post("/collections", json={"name": "Roman Coins"})
        assert response.status_code == 409
        assert response.json()["detail"] == "Collection name already exists"
    finally:
        client.close()
        session.close()


def test_collection_name_must_not_be_empty() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        response = client.post("/collections", json={"name": "   "})
        assert response.status_code == 400
        assert response.json()["detail"] == "Name cannot be empty"
    finally:
        client.close()
        session.close()


def test_collection_delete_is_blocked_when_used_by_coin() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        collection = Collection(name="Used Collection")
        country = Country(name="Test Country")
        denomination = Denomination(name="Test Denomination")
        era = Era(name="CE")
        session.add_all([collection, country, denomination, era])
        session.commit()

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
        session.commit()

        response = client.delete(f"/collections/{collection.id}")
        assert response.status_code == 409
        assert response.json()["detail"] == "Collection contains coins"

        assert session.get(Collection, collection.id) is not None
    finally:
        client.close()
        session.close()


def test_update_collection_cannot_use_existing_name() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        first = client.post("/collections", json={"name": "First"})
        second = client.post("/collections", json={"name": "Second"})
        first_id = first.json()["id"]
        second_id = second.json()["id"]

        response = client.put(
            f"/collections/{second_id}",
            json={"name": " First ", "description": None},
        )
        assert response.status_code == 409
        assert response.json()["detail"] == "Collection name already exists"

        assert session.get(Collection, first_id).name == "First"
        assert session.get(Collection, second_id).name == "Second"
    finally:
        client.close()
        session.close()


def test_missing_collection_returns_404() -> None:
    session = next(make_session())
    client = next(make_client(session))

    try:
        response = client.get("/collections/999999")
        assert response.status_code == 404

        response = client.put(
            "/collections/999999",
            json={"name": "Missing", "description": None},
        )
        assert response.status_code == 404

        response = client.delete("/collections/999999")
        assert response.status_code == 404
    finally:
        client.close()
        session.close()
