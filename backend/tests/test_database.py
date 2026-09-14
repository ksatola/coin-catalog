from sqlalchemy import UniqueConstraint, text

from coin_catalog.database import SessionLocal
from coin_catalog.models import Base, Coin


def test_database_session() -> None:
    with SessionLocal() as session:
        result = session.execute(text("SELECT 1"))
        assert result.scalar_one() == 1


def test_initial_schema_tables() -> None:
    expected_tables = {
        "coin",
        "country",
        "denomination",
        "era",
        "issuer",
        "material",
        "mint",
        "state",
    }

    assert set(Base.metadata.tables) == expected_tables


def test_coin_columns() -> None:
    columns = Base.metadata.tables["coin"].c

    required_columns = {
        "id",
        "country_id",
        "denomination_id",
        "from_year",
        "from_era_id",
        "to_year",
        "to_era_id",
        "has_video",
        "created_at",
        "updated_at",
    }
    optional_columns = {
        "issuer_id",
        "mint_id",
        "material_id",
        "state_id",
        "description",
        "weight",
        "diameter",
        "source",
    }

    assert required_columns | optional_columns == set(columns.keys())
    assert "currency_id" not in columns

    for column_name in required_columns:
        assert columns[column_name].nullable is False

    for column_name in optional_columns:
        assert columns[column_name].nullable is True


def test_reference_table_names_are_unique_and_required() -> None:
    reference_tables = {
        "country",
        "denomination",
        "era",
        "issuer",
        "material",
        "mint",
        "state",
    }

    for table_name in reference_tables:
        column = Base.metadata.tables[table_name].c.name
        assert column.nullable is False
        assert column.unique is True


def test_coin_has_no_unique_constraints() -> None:
    table = Base.metadata.tables["coin"]
    unique_constraints = [
        constraint
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    ]

    assert not unique_constraints
    assert list(Coin.__table__.primary_key.columns.keys()) == ["id"]
