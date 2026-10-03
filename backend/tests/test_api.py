from collections.abc import Generator
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import (
    AcquisitionMethod,
    Coin,
    CoinImage,
    Collection,
    Country,
    Denomination,
    Era,
    Issuer,
    Material,
    Mint,
    State,
)

DICTIONARY_NAMES = (
    "acquisition_methods",
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
    collection = Collection(name="Test Collection")
    country = Country(name="Test Country")
    issuer = Issuer(name="Test Issuer")
    denomination = Denomination(name="Test Denomination")
    mint = Mint(name="Test Mint")
    material = Material(name="Test Material")
    state = State(name="Test State")
    era = Era(name="CE")
    acquisition_method = AcquisitionMethod(name="Test Acquisition")

    session.add_all(
        [
            collection,
            country,
            issuer,
            denomination,
            mint,
            material,
            state,
            era,
            acquisition_method,
        ],
    )
    session.commit()

    return {
        "collection_id": collection.id,
        "country_id": country.id,
        "issuer_id": issuer.id,
        "denomination_id": denomination.id,
        "mint_id": mint.id,
        "material_id": material.id,
        "state_id": state.id,
        "era_id": era.id,
        "acquisition_method_id": acquisition_method.id,
    }


def test_create_coin(client: TestClient, reference_data: dict[str, int]) -> None:
    response = client.post(
        "/coins",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "from_year": 1900,
            "from_era_id": reference_data["era_id"],
            "to_year": 1900,
            "to_era_id": reference_data["era_id"],
            "description": "Test coin",
            "collection_number": "KC-001",
        },
    )

    assert response.status_code == 201

    data = response.json()
    assert data["id"] is not None
    assert data["collection_id"] == reference_data["collection_id"]
    assert data["description"] == "Test coin"
    assert data["collection_number"] == "KC-001"
    assert data["is_deleted"] is False


def test_coin_description_and_acquisition_crud(
    client: TestClient,
    reference_data: dict[str, int],
) -> None:
    dictionary_response = client.post(
        "/dictionaries/acquisition_methods",
        json={"name": "Dom Aukcyjny Testowy"},
    )
    assert dictionary_response.status_code == 201
    acquisition_method_id = dictionary_response.json()["id"]

    response = client.post(
        "/coins",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "avers_description": "Portret władcy",
            "revers_description": "Orzeł na rewersie",
            "literature": "Katalog testowy, poz. 123",
            "acquisition_method_id": acquisition_method_id,
            "purchase_price": 123.45,
            "purchase_date": "2026-09-28",
        },
    )
    assert response.status_code == 201
    coin_id = response.json()["id"]
    assert response.json()["from_year"] is None
    assert response.json()["from_era_id"] is None
    assert response.json()["to_year"] is None
    assert response.json()["to_era_id"] is None
    assert response.json()["acquisition_method_id"] == acquisition_method_id
    assert response.json()["acquisition_method_text"] is None
    assert Decimal(response.json()["purchase_price"]) == Decimal("123.45")
    assert response.json()["purchase_date"] == "2026-09-28"

    response = client.put(
        f"/coins/{coin_id}",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "avers_description": "Nowy opis awersu",
            "revers_description": None,
            "literature": "Nowa literatura",
            "acquisition_method_id": acquisition_method_id,
            "acquisition_method_text": "Zakup od prywatnego kolekcjonera",
            "purchase_price": 150.00,
            "purchase_date": "2026-09-27",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["avers_description"] == "Nowy opis awersu"
    assert data["revers_description"] is None
    assert data["literature"] == "Nowa literatura"
    assert data["acquisition_method_id"] == acquisition_method_id
    assert data["acquisition_method_text"] == "Zakup od prywatnego kolekcjonera"
    assert Decimal(data["purchase_price"]) == Decimal("150.0")
    assert data["purchase_date"] == "2026-09-27"

    response = client.get(f"/coins/{coin_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["avers_description"] == "Nowy opis awersu"
    assert data["revers_description"] is None
    assert data["literature"] == "Nowa literatura"
    assert data["acquisition_method_text"] == "Zakup od prywatnego kolekcjonera"
    assert Decimal(data["purchase_price"]) == Decimal("150.0")
    assert data["purchase_date"] == "2026-09-27"

    response = client.put(
        f"/coins/{coin_id}",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "avers_description": None,
            "revers_description": None,
            "literature": None,
            "acquisition_method_id": None,
            "acquisition_method_text": None,
            "purchase_price": None,
            "purchase_date": None,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["avers_description"] is None
    assert data["revers_description"] is None
    assert data["literature"] is None
    assert data["acquisition_method_id"] is None
    assert data["acquisition_method_text"] is None
    assert data["purchase_price"] is None
    assert data["purchase_date"] is None


def test_update_coin_collection_number(
    client: TestClient,
    reference_data: dict[str, int],
) -> None:
    response = client.post(
        "/coins",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "from_year": 1900,
            "from_era_id": reference_data["era_id"],
            "to_year": 1900,
            "to_era_id": reference_data["era_id"],
            "collection_number": "KC-001",
        },
    )
    assert response.status_code == 201
    coin_id = response.json()["id"]

    response = client.put(
        f"/coins/{coin_id}",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "from_year": 1900,
            "from_era_id": reference_data["era_id"],
            "to_year": 1900,
            "to_era_id": reference_data["era_id"],
            "collection_number": "KC-002",
        },
    )

    assert response.status_code == 200
    assert response.json()["collection_number"] == "KC-002"

    response = client.get(f"/coins/{coin_id}")
    assert response.status_code == 200
    assert response.json()["collection_number"] == "KC-002"


def test_list_coins_returns_active_coins_only(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    active_coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
    )
    deleted_coin = Coin(
        collection_id=reference_data["collection_id"],
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


def test_list_coins_includes_image_metadata(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
    )
    session.add(coin)
    session.flush()

    session.add_all(
        [
            CoinImage(
                coin_id=coin.id,
                filename=f"{coin.id}-avers.jpg",
                kind="avers",
                sort_order=0,
            ),
            CoinImage(
                coin_id=coin.id,
                filename=f"{coin.id}-rewers.jpg",
                kind="rewers",
                sort_order=0,
            ),
            CoinImage(
                coin_id=coin.id,
                filename=f"{coin.id}-additional.jpg",
                kind="additional",
                sort_order=0,
            ),
        ],
    )
    session.commit()

    response = client.get("/coins")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["images"] == [
        {"id": image.id, "kind": image.kind, "revision": image.revision}
        for image in session.query(CoinImage)
        .filter(CoinImage.coin_id == coin.id)
        .order_by(CoinImage.id)
        .all()
        if image.kind in {"avers", "rewers"}
    ]


def test_list_archived_coins_returns_archived_coins_only(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    active_coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
    )
    archived_coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1901,
        from_era_id=reference_data["era_id"],
        to_year=1901,
        to_era_id=reference_data["era_id"],
        is_deleted=True,
    )

    session.add_all([active_coin, archived_coin])
    session.commit()

    response = client.get("/coins/archived")

    assert response.status_code == 200

    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == archived_coin.id
    assert data[0]["is_deleted"] is True


def test_archive_coin(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
    )
    session.add(coin)
    session.commit()

    response = client.post(f"/coins/{coin.id}/archive")

    assert response.status_code == 200
    assert response.json()["id"] == coin.id
    assert response.json()["is_deleted"] is True

    response = client.get("/coins")
    assert response.status_code == 200
    assert all(item["id"] != coin.id for item in response.json())

    response = client.get("/coins/archived")
    assert response.status_code == 200
    assert any(item["id"] == coin.id for item in response.json())


def test_restore_coin(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1900,
        from_era_id=reference_data["era_id"],
        to_year=1900,
        to_era_id=reference_data["era_id"],
        is_deleted=True,
    )
    session.add(coin)
    session.commit()

    response = client.post(f"/coins/{coin.id}/restore")

    assert response.status_code == 200
    assert response.json()["id"] == coin.id
    assert response.json()["is_deleted"] is False

    response = client.get("/coins/archived")
    assert response.status_code == 200
    assert all(item["id"] != coin.id for item in response.json())

    response = client.get("/coins")
    assert response.status_code == 200
    assert any(item["id"] == coin.id for item in response.json())


def test_archive_and_restore_coin_round_trip(
    client: TestClient,
    reference_data: dict[str, int],
) -> None:
    response = client.post(
        "/coins",
        json={
            "collection_id": reference_data["collection_id"],
            "country_id": reference_data["country_id"],
            "denomination_id": reference_data["denomination_id"],
            "from_year": 1900,
            "from_era_id": reference_data["era_id"],
            "to_year": 1900,
            "to_era_id": reference_data["era_id"],
            "description": "Round trip coin",
        },
    )
    assert response.status_code == 201
    coin_id = response.json()["id"]

    response = client.post(f"/coins/{coin_id}/archive")
    assert response.status_code == 200
    assert response.json()["is_deleted"] is True

    response = client.get("/coins/archived")
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [coin_id]

    response = client.post(f"/coins/{coin_id}/restore")
    assert response.status_code == 200
    assert response.json()["is_deleted"] is False

    response = client.get("/coins/archived")
    assert response.status_code == 200
    assert all(item["id"] != coin_id for item in response.json())

    response = client.get("/coins")
    assert response.status_code == 200
    assert any(item["id"] == coin_id for item in response.json())


def test_get_coin(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coin = Coin(
        collection_id=reference_data["collection_id"],
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
    assert any(
        item["id"] == item_id and item["name"] == "Created Item" for item in items
    )

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
        ("acquisition_methods", "acquisition_method_id", "acquisition_method_id"),
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
        "collection_id": reference_data["collection_id"],
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
        collection_id=reference_data["collection_id"],
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


def test_list_coins_cursor_pagination(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coins = [
        Coin(
            collection_id=reference_data["collection_id"],
            country_id=reference_data["country_id"],
            denomination_id=reference_data["denomination_id"],
            from_year=1900 + index,
            from_era_id=reference_data["era_id"],
            to_year=1900 + index,
            to_era_id=reference_data["era_id"],
        )
        for index in range(5)
    ]
    session.add_all(coins)
    session.commit()

    first = client.get("/coins?limit=2&sort_by=id&sort_order=asc")
    assert first.status_code == 200
    first_data = first.json()

    assert [item["id"] for item in first_data["items"]] == [
        coins[0].id,
        coins[1].id,
    ]
    assert first_data["has_more"] is True
    assert first_data["next_cursor"]

    second = client.get(
        "/coins",
        params={
            "limit": 2,
            "sort_by": "id",
            "sort_order": "asc",
            "cursor": first_data["next_cursor"],
        },
    )
    assert second.status_code == 200
    second_data = second.json()

    assert [item["id"] for item in second_data["items"]] == [
        coins[2].id,
        coins[3].id,
    ]
    assert second_data["has_more"] is True

    third = client.get(
        "/coins",
        params={
            "limit": 2,
            "sort_by": "id",
            "sort_order": "asc",
            "cursor": second_data["next_cursor"],
        },
    )
    assert third.status_code == 200
    third_data = third.json()

    assert [item["id"] for item in third_data["items"]] == [coins[4].id]
    assert third_data["has_more"] is False
    assert third_data["next_cursor"] is None


def test_list_coins_cursor_pagination_supports_sorting_and_null_years(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coins = [
        Coin(
            collection_id=reference_data["collection_id"],
            country_id=reference_data["country_id"],
            denomination_id=reference_data["denomination_id"],
            from_year=year,
            from_era_id=reference_data["era_id"] if year is not None else None,
            to_year=year,
            to_era_id=reference_data["era_id"] if year is not None else None,
        )
        for year in (None, 1900, 1900, 1910, None)
    ]
    session.add_all(coins)
    session.commit()

    first = client.get(
        "/coins",
        params={"limit": 2, "sort_by": "from_year", "sort_order": "asc"},
    )
    assert first.status_code == 200
    first_data = first.json()

    assert [item["from_year"] for item in first_data["items"]] == [None, None]

    second = client.get(
        "/coins",
        params={
            "limit": 2,
            "sort_by": "from_year",
            "sort_order": "asc",
            "cursor": first_data["next_cursor"],
        },
    )
    assert second.status_code == 200
    second_data = second.json()

    assert [item["from_year"] for item in second_data["items"]] == [1900, 1900]


def test_coin_navigation_respects_filters_and_sorting(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    matching = [
        Coin(
            collection_id=reference_data["collection_id"],
            country_id=reference_data["country_id"],
            denomination_id=reference_data["denomination_id"],
            from_year=year,
            from_era_id=reference_data["era_id"],
            to_year=year,
            to_era_id=reference_data["era_id"],
        )
        for year in (1900, 1901, 1902)
    ]
    excluded = Coin(
        collection_id=reference_data["collection_id"],
        country_id=reference_data["country_id"],
        denomination_id=reference_data["denomination_id"],
        from_year=1899,
        from_era_id=reference_data["era_id"],
        to_year=1899,
        to_era_id=reference_data["era_id"],
        is_deleted=True,
    )
    session.add_all([*matching, excluded])
    session.commit()

    response = client.get(
        f"/coins/{matching[1].id}/navigation",
        params={
            "status": "active",
            "sort_by": "from_year",
            "sort_order": "asc",
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "previous_id": matching[0].id,
        "next_id": matching[2].id,
    }

    response = client.get(
        f"/coins/{matching[1].id}/navigation",
        params={
            "status": "archived",
            "sort_by": "id",
            "sort_order": "asc",
        },
    )
    assert response.status_code == 200
    assert response.json() == {"previous_id": None, "next_id": None}


def test_coin_navigation_returns_boundaries(
    client: TestClient,
    session: Session,
    reference_data: dict[str, int],
) -> None:
    coins = [
        Coin(
            collection_id=reference_data["collection_id"],
            country_id=reference_data["country_id"],
            denomination_id=reference_data["denomination_id"],
        )
        for _ in range(2)
    ]
    session.add_all(coins)
    session.commit()

    first = client.get(f"/coins/{coins[0].id}/navigation")
    assert first.status_code == 200
    assert first.json() == {
        "previous_id": None,
        "next_id": coins[1].id,
    }

    last = client.get(f"/coins/{coins[1].id}/navigation")
    assert last.status_code == 200
    assert last.json() == {
        "previous_id": coins[0].id,
        "next_id": None,
    }


def test_list_coins_rejects_invalid_cursor(
    client: TestClient,
    reference_data: dict[str, int],
) -> None:
    response = client.get("/coins?limit=2&cursor=not-a-valid-cursor")

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid cursor"
