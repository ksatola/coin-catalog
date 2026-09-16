from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from coin_catalog import database


def test_collections_migration_upgrade_and_downgrade(
    tmp_path: Path,
    monkeypatch,
) -> None:
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path}"
    engine = create_engine(database_url)

    monkeypatch.setattr(database, "DATABASE_URL", database_url)

    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))

    command.upgrade(config, "9c7e1a2b4d6f")
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO coin (country_id, denomination_id, from_year, from_era_id, "
                "to_year, to_era_id) VALUES (1, 1, 1900, 1, 1900, 1)"
            )
        )

    command.upgrade(config, "b1c2d3e4f5a6")

    inspector = inspect(engine)
    assert "collection" in inspector.get_table_names()
    columns = {column["name"]: column for column in inspector.get_columns("coin")}
    assert "collection_id" in columns
    assert columns["collection_id"]["nullable"] is False
    assert columns["collection_id"]["type"].__class__.__name__ == "INTEGER"

    foreign_keys = inspector.get_foreign_keys("coin")
    collection_fk = next(
        foreign_key
        for foreign_key in foreign_keys
        if foreign_key["referred_table"] == "collection"
    )
    assert collection_fk["constrained_columns"] == ["collection_id"]
    assert collection_fk["referred_columns"] == ["id"]
    assert collection_fk["options"]["ondelete"] == "RESTRICT"

    with engine.connect() as connection:
        collection = connection.execute(
            text("SELECT id, name FROM collection WHERE name = 'Default Collection'")
        ).one()
        assert collection.name == "Default Collection"
        assert connection.execute(
            text("SELECT collection_id FROM coin WHERE id = 1")
        ).scalar_one() == collection.id

    command.downgrade(config, "9c7e1a2b4d6f")

    inspector = inspect(engine)
    assert "collection" not in inspector.get_table_names()
    assert "collection_id" not in {
        column["name"] for column in inspector.get_columns("coin")
    }

    engine.dispose()
