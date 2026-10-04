from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.models import StoryAsset


@pytest.fixture
def client() -> Generator[tuple[TestClient, Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    try:
        yield test_client, session
    finally:
        test_client.close()
        app.dependency_overrides.clear()
        session.close()
        engine.dispose()


def test_story_page_returns_metadata_for_referenced_assets(
    client: tuple[TestClient, Session],
) -> None:
    test_client, session = client
    response = test_client.post(
        "/story/pages",
        json={"title": "Assety", "content": "Przed {{ image:17 }} i {{ image:17 }}."},
    )
    assert response.status_code == 201

    session.add(
        StoryAsset(
            id=17,
            filename="17.jpg",
            original_filename="mapa.jpg",
            mime_type="image/jpeg",
            file_size_bytes=100,
            width=1200,
            height=800,
            alt_text="Mapa Polski",
        )
    )
    session.commit()

    page = test_client.get(f"/story/pages/{response.json()['id']}")
    assert page.status_code == 200
    payload = page.json()
    embedded = payload["embedded_assets"]
    assert len(embedded) == 1
    assert embedded[0]["id"] == 17
    assert embedded[0]["asset"]["original_filename"] == "mapa.jpg"
    assert embedded[0]["asset"]["alt_text"] == "Mapa Polski"
