from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from coin_catalog import database


def test_legacy_acquisition_method_text_is_mapped_to_dictionary(
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

    command.upgrade(config, "b5c6d7e8f9a0")

    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO acquisition_method (id, name) VALUES (1, 'Aukcja')")
        )
        connection.execute(
            text("INSERT INTO acquisition_method (id, name) VALUES (2, 'Sklep')")
        )
        connection.execute(
            text("INSERT INTO country (id, name) VALUES (1, 'Polska')")
        )
        connection.execute(
            text("INSERT INTO denomination (id, name) VALUES (1, '1 zł')")
        )
        connection.execute(text("INSERT INTO era (id, name) VALUES (1, 'CE')"))
        connection.execute(
            text(
                """
                INSERT INTO coin (
                    id, collection_id, country_id, denomination_id,
                    from_year, from_era_id, to_year, to_era_id,
                    has_video, acquisition_method_id, acquisition_method_text,
                    created_at, updated_at
                )
                VALUES
                    (1, 1, 1, 1, 2000, 1, 2000, 1, 0, NULL, 'Aukcja',
                     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (2, 1, 1, 1, 2000, 1, 2000, 1, 0, NULL, 'Nieznany sposób',
                     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (3, 1, 1, 1, 2000, 1, 2000, 1, 0, 1, 'Stary tekst',
                     CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    command.upgrade(config, "c7d8e9f0a1b2")

    with engine.connect() as connection:
        rows = connection.execute(
            text(
                """
                SELECT id, acquisition_method_id, acquisition_method_text
                FROM coin
                ORDER BY id
                """
            )
        ).mappings().all()

    assert rows == [
        {"id": 1, "acquisition_method_id": 1, "acquisition_method_text": None},
        {
            "id": 2,
            "acquisition_method_id": None,
            "acquisition_method_text": "Nieznany sposób",
        },
        {
            "id": 3,
            "acquisition_method_id": 1,
            "acquisition_method_text": "Stary tekst",
        },
    ]

    engine.dispose()
