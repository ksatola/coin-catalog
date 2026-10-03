from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app


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


def create_page(client: TestClient, title: str, parent_id: int | None = None) -> dict:
    response = client.post(
        "/story/pages",
        json={"title": title, "parent_id": parent_id, "content": "# " + title},
    )
    assert response.status_code == 201
    return response.json()


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
        json={"title": "Different", "slug": "child", "parent_id": root["id"], "content": ""},
    )
    assert duplicate_slug.status_code == 409


def test_story_page_move_rejects_cycles_and_conflicts(client: TestClient) -> None:
    root = create_page(client, "Root")
    child = create_page(client, "Child", root["id"])
    grandchild = create_page(client, "Grandchild", child["id"])
    target = create_page(client, "Target")

    assert client.post(
        "/story/pages/" + str(child["id"]) + "/move",
        json={"parent_id": child["id"]},
    ).status_code == 409

    assert client.post(
        "/story/pages/" + str(root["id"]) + "/move",
        json={"parent_id": grandchild["id"]},
    ).status_code == 409

    create_page(client, "Child", target["id"])
    assert client.post(
        "/story/pages/" + str(child["id"]) + "/move",
        json={"parent_id": target["id"]},
    ).status_code == 409


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
    second = create_page(client, "Second")
    third = create_page(client, "Third")

    assert client.post(
        "/story/pages/" + str(third["id"]) + "/reorder",
        json={"direction": "up"},
    ).status_code == 200

    tree = client.get("/story/pages/tree").json()
    assert [item["title"] for item in tree] == ["First", "Third", "Second"]

    assert client.post(
        "/story/pages/" + str(first["id"]) + "/reorder",
        json={"direction": "up"},
    ).status_code == 200
    assert [item["title"] for item in client.get("/story/pages/tree").json()] == [
        "First", "Third", "Second"
    ]


def test_story_page_path_lookup(client: TestClient) -> None:
    root = create_page(client, "Monety polskie")
    create_page(client, "Jan Kazimierz", root["id"])

    response = client.get("/story/pages/path/monety-polskie/jan-kazimierz")
    assert response.status_code == 200
    assert response.json()["title"] == "Jan Kazimierz"
