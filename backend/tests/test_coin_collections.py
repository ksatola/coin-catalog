from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, Collection, Country, Denomination, Era


def create_test_coin_payload(reference_data: dict[str, int]) -> dict[str, int | str]:
    return {
        "collection_id": reference_data["collection_id"],
        "country_id": reference_data["country_id"],
        "denomination_id": reference_data["denomination_id"],
        "from_year": 1900,
        "from_era_id": reference_data["era_id"],
        "to_year": 1900,
        "to_era_id": reference_data["era_id"],
        "collection_number": "KC-001",
    }


def test_session() -> Generator[Session]:
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


def test_client(test_session: Generator[Session]) -> Generator[TestClient]:
    session = next(test_session)

    def override_get_db() -> Generator[Session]:
        yield session

    app.dependency_overrides[get_db] = override_get_db

    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
        try:
            next(test_session)
        except StopIteration:
            pass


def seed_reference_data(session: Session) -> dict[str, int]:
    collection = Collection(name="Test Collection")
    second_collection = Collection(name="Second Collection")
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([collection, second_collection, country, denomination, era])
    session.commit()

    return {
        "collection_id": collection.id,
        "second_collection_id": second_collection.id,
        "country_id": country.id,
        "denomination_id": denomination.id,
        "era_id": era.id,
    }


def test_create_coin_rejects_missing_collection(test_client: TestClient) -> None:
    response = test_client.post(
        "/coins",
        json={
            "collection_id": 999999,
            "country_id": 1,
            "denomination_id": 1,
            "from_year": 1900,
            "from_era_id": 1,
            "to_year": 1900,
            "to_era_id": 1,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Collection not found"


def test_update_coin_rejects_missing_collection(
    test_client: TestClient,
    test_session: Generator[Session],
) -> None:
    session = next(test_session)
    reference_data = seed_reference_data(session)
    coin = Coin(**create_test_coin_payload(reference_data))
    session.add(coin)
    session.commit()

    payload = create_test_coin_payload(reference_data)
    payload["collection_id"] = 999999

    response = test_client.put(f"/coins/{coin.id}", json=payload)

    assert response.status_code == 404
    assert response.json()["detail"] == "Collection not found"


def test_update_coin_cannot_change_collection_directly(
    test_client: TestClient,
    test_session: Generator[Session],
) -> None:
    session = next(test_session)
    reference_data = seed_reference_data(session)
    coin = Coin(**create_test_coin_payload(reference_data))
    session.add(coin)
    session.commit()
    original_coin_id = coin.id

    payload = create_test_coin_payload(reference_data)
    payload["collection_id"] = reference_data["second_collection_id"]

    response = test_client.put(f"/coins/{coin.id}", json=payload)

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Coin collection must be changed through the move operation"
    )

    session.refresh(coin)
    assert coin.id == original_coin_id
    assert coin.collection_id == reference_data["collection_id"]
