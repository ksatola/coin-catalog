from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from coin_catalog import database


def test_collection_number_migration_upgrade_and_downgrade(
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

    command.upgrade(config, "9c7e1a2b4d6f")

    inspector = inspect(engine)
    columns = {column["name"]: column for column in inspector.get_columns("coin")}
    assert "collection_number" in columns
    assert columns["collection_number"]["nullable"] is True
    assert columns["collection_number"]["type"].__class__.__name__ == "TEXT"

    command.downgrade(config, "7a1b2c3d4e5f")

    inspector = inspect(engine)
    assert "collection_number" not in {
        column["name"] for column in inspector.get_columns("coin")
    }

    engine.dispose()
