from sqlalchemy import text

from coin_catalog.database import SessionLocal


def test_database_session() -> None:
    with SessionLocal() as session:
        result = session.execute(text("SELECT 1"))
        assert result.scalar_one() == 1
