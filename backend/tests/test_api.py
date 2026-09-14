from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, Country, Denomination, Era


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
def reference_data(session: Session) -> dict[str, int]:
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")

    session.add_all([country, denomination, era])
    session.commit()

    return {
        "country_id": country.id,
        "denomination_id": denomination.id,
        "era_id": era.id,
    }


def test_create_coin(client: TestClient, reference_data: dict[str, int]) -> None:
    response = client.post(
        "/coins",
        json={
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "from_year": 1900,
            "from_era_id": reference_data["era_id"],
            "to_year": 1900,
            "to_era_id": reference_data["era_id"],
            "description": "Test coin",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["description"] == "Test coin"
    assert data["is_deleted"] is False


def test_list_coins_returns_active_coins_only(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    active_coin = Coin(
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
    )
    deleted_coin = Coin(
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1901,
        from_era_id=reference_data["era_id"],
        to_year=1901,
        to_era_id=reference_data["era_id"],
        is_deleted=True,
    )

    session.add_all([active_coin, deleted_coin])
    session.commit()

    response = client.get("/coins")

    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == active_coin.id


def test_get_coin(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = Coin(
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
        description="Detailed coin",
    )
    session.add(coin)
    session.commit()

    response = client.get(f"/coins/{coin.id}")

    assert response.status_code == 200
    assert response.json()["id"] == coin.id
    assert response.json()["description"] == "Detailed coin"


def test_get_missing_coin_returns_404(client: TestClient) -> None:
    response = client.get("/coins/999999")

    assert response.status_code == 404
