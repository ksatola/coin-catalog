from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, Country, Denomination, Era, Issuer, Material, Mint, State


DICTIONARY_NAMES = (
    "countries",
    "issuers",
    "denominations",
    "mints",
    "materials",
    "states",
    "eras",
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
    issuer = Issuer(name="Test Issuer")
    denomination = Denomination(name="Test Denomination")
    mint = Mint(name="Test Mint")
    material = Material(name="Test Material")
    state = State(name="Test State")
    era = Era(name="CE")

    session.add_all(
        [country, issuer, denomination, mint, material, state, era],
    )
    session.commit()

    return {
        "country_id": country.id,
        "issuer_id": issuer.id,
        "denomination_id": denomination.id,
        "mint_id": mint.id,
        "material_id": material.id,
        "state_id": state.id,
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


@pytest.mark.parametrize("dictionary_name", DICTIONARY_NAMES)
def test_dictionary_crud(
    client: TestClient,
    dictionary_name: str,
) -> None:
    response = client.post(
        f"/dictionaries/{dictionary_name}",
        json={"name": "Created Item"},
    )

    assert response.status_code == 201
    item_id = response.json()["id"]
    assert response.json()["name"] == "Created Item"

    response = client.get(f"/dictionaries/{dictionary_name}")

    assert response.status_code == 200
    items = response.json()
    assert any(item["id"] == item_id and item["name"] == "Created Item" for item in items)

    response = client.put(
        f"/dictionaries/{dictionary_name}/{item_id}",
        json={"name": "Updated Item"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == item_id
    assert response.json()["name"] == "Updated Item"

    response = client.delete(f"/dictionaries/{dictionary_name}/{item_id}")

    assert response.status_code == 204

    response = client.get(f"/dictionaries/{dictionary_name}")

    assert response.status_code == 200
    assert all(item["id"] != item_id for item in response.json())


@pytest.mark.parametrize(
    ("dictionary_name", "reference_key", "coin_field"),
    [
        ("countries", "country_id", "country_id"),
        ("issuers", "issuer_id", "issuer_id"),
        ("denominations", "denomination_id", "denomination_id"),
        ("mints", "mint_id", "mint_id"),
        ("materials", "material_id", "material_id"),
        ("states", "state_id", "state_id"),
        ("eras", "era_id", "from_era_id"),
    ],
)
def test_dictionary_delete_is_blocked_when_used_by_coin(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
    dictionary_name: str,
    reference_key: str,
    coin_field: str,
) -> None:
    item_id = reference_data[reference_key]

    coin_data = {
        "country_id": reference_data["country_id"],
        "denomination_id": reference_data["denomination_id"],
        "from_year": 1900,
        "from_era_id": reference_data["era_id"],
        "to_year": 1900,
        "to_era_id": reference_data["era_id"],
    }
    coin_data[coin_field] = item_id

    coin = Coin(**coin_data)
    session.add(coin)
    session.commit()

    response = client.delete(f"/dictionaries/{dictionary_name}/{item_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Item is used by a coin"

    response = client.get(f"/dictionaries/{dictionary_name}")

    assert response.status_code == 200
    assert any(item["id"] == item_id for item in response.json())


def test_dictionary_era_delete_is_blocked_when_used_by_coin_to_era(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    item_id = reference_data["era_id"]

    coin = Coin(
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
    )
    session.add(coin)
    session.commit()

    response = client.delete(f"/dictionaries/eras/{item_id}")

    assert response.status_code == 409
    assert response.json()["detail"] == "Item is used by a coin"
