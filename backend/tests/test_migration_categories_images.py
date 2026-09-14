from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from coin_catalog import database


def test_categories_and_images_migration_upgrade_and_downgrade(
    tmp_path: Path,
    monkeypatch,
) -> None:
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    monkeypatch.setattr(database, "DATABASE_URL", database_url)

    config = Config(
        str(Path(__file__).parents[1] / "alembic.ini"),
    )

    command.upgrade(config, "7a1b2c3d4e5f")

    inspector = inspect(engine)
    assert {
        "category",
        "category_relation",
        "coin_category",
        "coin_image",
    }.issubset(set(inspector.get_table_names()))

    indexes = {index["name"] for index in inspector.get_indexes("coin_image")}
    assert "uq_coin_image_avers" in indexes
    assert "uq_coin_image_rewers" in indexes

    command.downgrade(config, "3f4a9c2d7b1e")

    inspector = inspect(engine)
    assert "category" not in inspector.get_table_names()
    assert "category_relation" not in inspector.get_table_names()
    assert "coin_category" not in inspector.get_table_names()
    assert "coin_image" not in inspector.get_table_names()

    engine.dispose()
