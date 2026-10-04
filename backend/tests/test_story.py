from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import Coin, CoinImage, Collection, Country, Denomination


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


def create_page(
    client: TestClient,
    title: str,
    parent_id: int | None = None,
    content: str | None = None,
) -> dict:
    response = client.post(
        "/story/pages",
        json={
            "title": title,
            "parent_id": parent_id,
            "content": content if content is not None else "# " + title,
        },
    )
    assert response.status_code == 201
    return response.json()


def create_coin(
    session: Session, coin_id: int | None = None, deleted: bool = False
) -> Coin:
    collection = Collection(name=f"Collection {coin_id or 'new'}")
    country = Country(name=f"Country {coin_id or 'new'}")
    denomination = Denomination(name=f"Denomination {coin_id or 'new'}")
    session.add_all([collection, country, denomination])
    session.flush()

    coin = Coin(
        id=coin_id,
        collection_id=collection.id,
        country_id=country.id,
        denomination_id=denomination.id,
        collection_number="K-123",
        is_deleted=deleted,
        description="Test coin",
    )
    session.add(coin)
    session.flush()
    session.add(
        CoinImage(
            coin_id=coin.id,
            filename=f"coin-{coin.id}.jpg",
            kind="avers",
            sort_order=0,
            revision=2,
        )
    )
    session.commit()
    session.refresh(coin)
    return coin


def test_story_page_crud_and_tree(client: TestClient) -> None:
    root = create_page(client, "Monety polskie")
    child = create_page(client, "Jan Kazimierz", root["id"])

    assert root["slug"] == "monety-polskie"
    assert child["slug"] == "jan-kazimierz"
    assert child["path"] == "monety-polskie/jan-kazimierz"

    tree = client.get("/story/pages/tree")
    assert tree.status_code == 200
    assert tree.json()[0]["children"][0]["id"] == child["id"]

    updated = client.put(
        "/story/pages/" + str(child["id"]),
        json={"title": "Jan Kazimierz II", "parent_id": root["id"], "content": "Treść"},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == "jan-kazimierz-ii"

    assert client.get("/story/pages/" + str(child["id"])).json()["content"] == "Treść"

    deleted = client.delete("/story/pages/" + str(child["id"]))
    assert deleted.status_code == 204
    assert client.get("/story/pages/" + str(child["id"])).status_code == 404


def test_story_page_embeds_existing_deleted_and_missing_coins(
    client: TestClient,
    session: Session,
) -> None:
    active = create_coin(session, coin_id=101)
    deleted = create_coin(session, coin_id=102, deleted=True)
    page = create_page(
        client,
        "Coin embeds",
        content="{{ coin:101 }} and {{ coin:101 }} and {{ coin:102 }} and {{ coin:999999 }}",
    )

    assert page["embedded_coins"] == [
        {
            "id": active.id,
            "coin": {
                **page["embedded_coins"][0]["coin"],
                "images": [{"id": active.images[0].id, "kind": "avers", "revision": 2}],
            },
            "deleted": False,
        },
        {
            "id": deleted.id,
            "coin": None,
            "deleted": True,
        },
        {
            "id": 999999,
            "coin": None,
            "deleted": True,
        },
    ]

    fetched = client.get("/story/pages/" + str(page["id"]))
    assert fetched.status_code == 200
    embedded = fetched.json()["embedded_coins"]
    assert [item["id"] for item in embedded] == [101, 102, 999999]
    assert embedded[0]["deleted"] is False
    assert embedded[0]["coin"]["id"] == 101
    assert embedded[0]["coin"]["images"][0]["id"] == active.images[0].id
    assert embedded[1] == {"id": 102, "coin": None, "deleted": True}
    assert embedded[2] == {"id": 999999, "coin": None, "deleted": True}


def test_story_page_rejects_sibling_conflicts(client: TestClient) -> None:
    root = create_page(client, "Root")
    create_page(client, "Child", root["id"])

    duplicate_title = client.post(
        "/story/pages",
        json={"title": "Child", "parent_id": root["id"], "content": ""},
    )
    assert duplicate_title.status_code == 409

    duplicate_slug = client.post(
        "/story/pages",
        json={
            "title": "Different",
            "slug": "child",
            "parent_id": root["id"],
            "content": "",
        },
    )
    assert duplicate_slug.status_code == 409


def test_story_page_move_rejects_cycles_and_conflicts(client: TestClient) -> None:
    root = create_page(client, "Root")
    child = create_page(client, "Child", root["id"])
    grandchild = create_page(client, "Grandchild", child["id"])
    target = create_page(client, "Target")

    assert (
        client.post(
            "/story/pages/" + str(child["id"]) + "/move",
            json={"parent_id": child["id"]},
        ).status_code
        == 409
    )

    assert (
        client.post(
            "/story/pages/" + str(root["id"]) + "/move",
            json={"parent_id": grandchild["id"]},
        ).status_code
        == 409
    )

    create_page(client, "Child", target["id"])
    assert (
        client.post(
            "/story/pages/" + str(child["id"]) + "/move",
            json={"parent_id": target["id"]},
        ).status_code
        == 409
    )


def test_story_page_move_preserves_descendants(client: TestClient) -> None:
    root = create_page(client, "Root")
    child = create_page(client, "Child", root["id"])
    grandchild = create_page(client, "Grandchild", child["id"])
    target = create_page(client, "Target")

    moved = client.post(
        "/story/pages/" + str(child["id"]) + "/move",
        json={"parent_id": target["id"]},
    )
    assert moved.status_code == 200
    assert moved.json()["parent_id"] == target["id"]

    grandchild_data = client.get("/story/pages/" + str(grandchild["id"])).json()
    assert grandchild_data["parent_id"] == child["id"]
    assert grandchild_data["path"] == "target/child/grandchild"


def test_story_page_reorder(client: TestClient) -> None:
    first = create_page(client, "First")
    create_page(client, "Second")
    third = create_page(client, "Third")

    assert (
        client.post(
            "/story/pages/" + str(third["id"]) + "/reorder",
            json={"direction": "up"},
        ).status_code
        == 200
    )

    tree = client.get("/story/pages/tree").json()
    assert [item["title"] for item in tree] == ["First", "Third", "Second"]

    assert (
        client.post(
            "/story/pages/" + str(first["id"]) + "/reorder",
            json={"direction": "up"},
        ).status_code
        == 200
    )
    assert [item["title"] for item in client.get("/story/pages/tree").json()] == [
        "First",
        "Third",
        "Second",
    ]


def test_story_page_path_lookup(client: TestClient) -> None:
    root = create_page(client, "Monety polskie")
    create_page(client, "Jan Kazimierz", root["id"])

    response = client.get("/story/pages/path/monety-polskie/jan-kazimierz")
    assert response.status_code == 200
    assert response.json()["title"] == "Jan Kazimierz"


def test_story_page_rejects_missing_parent_and_non_leaf_delete(
    client: TestClient,
) -> None:
    missing_parent = client.post(
        "/story/pages",
        json={"title": "Orphan", "parent_id": 999999, "content": ""},
    )
    assert missing_parent.status_code == 404

    root = create_page(client, "Root")
    create_page(client, "Child", root["id"])
    delete_root = client.delete("/story/pages/" + str(root["id"]))
    assert delete_root.status_code == 409
