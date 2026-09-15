from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import (
    Category,
    CategoryRelation,
    Coin,
    CoinCategory,
    CoinImage,
    Country,
    Denomination,
    Era,
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
def data(session: Session) -> dict[str, Coin | Category]:
    country = Country(name="Polska")
    denomination = Denomination(name="Grosz")
    era = Era(name="AD")
    root = Category(name="Monety")
    parent = Category(name="Polska")
    child = Category(name="Grosz")
    other = Category(name="Inne")
    session.add_all([country, denomination, era, root, parent, child, other])
    session.flush()

    session.add_all(
        [
            CategoryRelation(parent_id=root.id, child_id=parent.id),
            CategoryRelation(parent_id=parent.id, child_id=child.id),
        ]
    )

    coin = Coin(
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1900,
        from_era_id=era.id,
        to_year=1901,
        to_era_id=era.id,
        description="Polski grosz srebrny",
    )
    archived = Coin(
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1800,
        from_era_id=era.id,
        to_year=1801,
        to_era_id=era.id,
        description="Archiwalny grosz",
        is_deleted=True,
    )
    session.add_all([coin, archived])
    session.flush()
    session.add(CoinCategory(coin_id=coin.id, category_id=child.id))
    session.add(
        CoinImage(
            coin_id=coin.id,
            filename="search-test.jpg",
            kind="avers",
            sort_order=0,
        )
    )
    session.commit()
    return {
        "coin": coin,
        "archived": archived,
        "root": root,
        "parent": parent,
        "child": child,
        "other": other,
    }


def ids(response) -> list[int]:
    assert response.status_code == 200
    return [item["id"] for item in response.json()]


def test_search_is_tokenized_and_order_independent(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]

    assert ids(client.get("/coins?search=polska+grosz")) == [coin.id]
    assert ids(client.get("/coins?search=grosz+polska")) == [coin.id]


def test_search_returns_each_coin_only_once(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]

    response = client.get("/coins?search=polska+grosz")
    result_ids = ids(response)

    assert result_ids == [coin.id]
    assert len(result_ids) == len(set(result_ids))


def test_search_supports_three_character_fragments(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]

    assert ids(client.get("/coins?search=pol")) == [coin.id]
    assert ids(client.get("/coins?search=ros")) == [coin.id]


def test_search_rejects_fragments_shorter_than_three_characters(
    client: TestClient,
) -> None:
    response = client.get("/coins?search=ab")

    assert response.status_code == 422
    assert response.json()["detail"] == "Search terms must contain at least 3 characters"


def test_search_matches_category_ancestors_and_exact_scope(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]
    root = data["root"]
    parent = data["parent"]
    child = data["child"]

    assert ids(client.get(f"/coins?search={root.name}")) == [coin.id]
    assert ids(client.get(f"/coins?search={parent.name}")) == [coin.id]
    assert ids(client.get(f"/coins?search={child.name}")) == [coin.id]
    assert ids(
        client.get(
            f"/coins?search={root.name}&include_category_children=false"
        )
    ) == []


def test_category_filter_can_include_or_exclude_children(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]
    root = data["root"]
    child = data["child"]

    assert ids(client.get(f"/coins?category_id={root.id}")) == [coin.id]
    assert ids(
        client.get(
            f"/coins?category_id={root.id}&include_category_children=false"
        )
    ) == []
    assert ids(client.get(f"/coins?category_id={child.id}")) == [coin.id]


def test_filters_combine_with_and_and_values_inside_filter_are_or(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]
    country = "1"

    assert ids(client.get(f"/coins?country_id={country}&from_year=1900")) == [coin.id]
    assert ids(client.get("/coins?country_id=1&country_id=999999")) == [coin.id]
    assert ids(client.get("/coins?country_id=999999&from_year=1900")) == []


def test_image_and_video_filters(
    client: TestClient, data: dict[str, Coin | Category]
) -> None:
    coin = data["coin"]

    assert ids(client.get("/coins?has_image=true")) == [coin.id]
    assert ids(client.get("/coins?has_image=false")) == []
    assert ids(client.get("/coins?has_video=false")) == [coin.id]
    assert ids(client.get("/coins?has_video=true")) == []


def test_status_filter_can_return_archived_or_all(
    client: TestClient,
    data: dict[str, Coin | Category],
) -> None:
    coin = data["coin"]
    archived = data["archived"]

    assert ids(client.get("/coins?status=active")) == [coin.id]
    assert ids(client.get("/coins?status=archived")) == [archived.id]
    assert ids(client.get("/coins?status=all")) == [coin.id, archived.id]


@pytest.mark.parametrize(
    ("sort_by", "sort_order", "expected"),
    [
        ("from_year", "asc", [2, 1]),
        ("from_year", "desc", [1, 2]),
    ],
)
def test_sorting(
    client: TestClient,
    data: dict[str, Coin | Category],
    sort_by: str,
    sort_order: str,
    expected: list[int],
) -> None:
    coin = data["coin"]
    archived = data["archived"]
    mapping = {1: coin.id, 2: archived.id}

    assert ids(
        client.get(
            f"/coins?status=all&sort_by={sort_by}&sort_order={sort_order}"
        )
    ) == [mapping[item] for item in expected]
