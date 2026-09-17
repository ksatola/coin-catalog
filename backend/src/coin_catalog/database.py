from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATA_DIR / "coin-catalog.db"
IMAGES_DIR = DATA_DIR / "images"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"


engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record) -> None:
    del connection_record
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as session:
        yield session


def initialize_database() -> None:
    """Create runtime data directories and ensure the SQLite file can be opened.

    Schema creation and upgrades remain the responsibility of Alembic.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    with engine.connect():
        pass
