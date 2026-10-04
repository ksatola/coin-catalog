from collections.abc import Generator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base, get_db
from coin_catalog.main import app
from coin_catalog.routes import story_assets


@pytest.fixture
def client(tmp_path, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient]:
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)

    def override_get_db():
        with session_factory() as session:
            yield session

    monkeypatch.setattr(story_assets, "ASSETS_DIR", tmp_path / "story" / "assets")
    monkeypatch.setattr(
        story_assets, "THUMBNAILS_DIR", tmp_path / "story" / "assets" / "thumbnails"
    )
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    try:
        yield test_client
    finally:
        test_client.close()
        app.dependency_overrides.clear()
        engine.dispose()


def image_bytes(image_format: str, size: tuple[int, int] = (1200, 600)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, "white").save(buffer, format=image_format)
    return buffer.getvalue()


def jpeg_bytes(size: tuple[int, int] = (1200, 600)) -> bytes:
    return image_bytes("JPEG", size)


def png_bytes(size: tuple[int, int] = (1200, 600)) -> bytes:
    return image_bytes("PNG", size)


def test_upload_asset_persists_metadata_and_files(client: TestClient) -> None:
    response = client.post(
        "/story/assets",
        files={"upload": ("oryginal.jpg", jpeg_bytes(), "image/jpeg")},
        data={"alt_text": "Ilustracja opowieści"},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["id"] == 1
    assert payload["filename"] == "1.jpg"
    assert payload["original_filename"] == "oryginal.jpg"
    assert payload["mime_type"] == "image/jpeg"
    assert payload["file_size_bytes"] > 0
    assert payload["width"] == 1200
    assert payload["height"] == 600
    assert payload["alt_text"] == "Ilustracja opowieści"
    assert (story_assets.ASSETS_DIR / "1.jpg").is_file()
    assert (story_assets.THUMBNAILS_DIR / "1.jpg").is_file()


def test_upload_png_persists_metadata_and_files(client: TestClient) -> None:
    response = client.post(
        "/story/assets", files={"upload": ("oryginal.png", png_bytes(), "image/png")}
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["id"] == 1
    assert payload["filename"] == "1.png"
    assert payload["original_filename"] == "oryginal.png"
    assert payload["mime_type"] == "image/png"
    assert payload["file_size_bytes"] > 0
    assert payload["width"] == 1200
    assert payload["height"] == 600
    assert (story_assets.ASSETS_DIR / "1.png").is_file()
    assert (story_assets.THUMBNAILS_DIR / "1.jpg").is_file()


def test_upload_rejects_non_image(client: TestClient) -> None:
    response = client.post(
        "/story/assets", files={"upload": ("not.gif", b"not-an-image", "image/gif")}
    )
    assert response.status_code == 400


def test_asset_file_and_thumbnail_are_served(client: TestClient) -> None:
    upload = client.post(
        "/story/assets", files={"upload": ("photo.jpg", jpeg_bytes(), "image/jpeg")}
    )
    assert upload.status_code == 201
    asset_id = upload.json()["id"]
    assert client.get(f"/story/assets/{asset_id}/file").status_code == 200
    assert client.get(f"/story/assets/{asset_id}/thumbnail").status_code == 200


def test_missing_asset_returns_404(client: TestClient) -> None:
    assert client.get("/story/assets/999/file").status_code == 404
    assert client.get("/story/assets/999/thumbnail").status_code == 404
