from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from coin_catalog.database import Base
from coin_catalog.models import Coin, Collection, Country, Denomination, Era


@pytest.fixture
def session() -> Generator[Session]:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine)()

    try:
        yield test_session
    finally:
        test_session.close()
        engine.dispose()


def make_collection(session: Session) -> Collection:
    collection = Collection(name="Test Collection")
    session.add(collection)
    session.flush()
    return collection


def make_coin_reference_data(
    session: Session,
) -> tuple[Collection, Country, Denomination, Era]:
    collection = make_collection(session)
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([country, denomination, era])
    session.flush()
    return collection, country, denomination, era


def test_database_session(session: Session) -> None:
    result = session.execute(text("SELECT 1"))
    assert result.scalar_one() == 1


def test_create_coin_with_required_data(session: Session) -> None:
    collection, country, denomination, era = make_coin_reference_data(session)

    coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=1900,
        from_era=era,
        to_year=1900,
        to_era=era,
    )
    session.add(coin)
    session.commit()

    assert coin.id is not None
    assert coin.collection is collection
    assert coin.is_deleted is False
    assert coin.has_video is False
    assert coin.created_at is not None
    assert coin.updated_at is not None


def test_identical_physical_coins_can_be_stored_separately(
    session: Session,
) -> None:
    collection, country, denomination, era = make_coin_reference_data(session)

    first_coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=1900,
        from_era=era,
        to_year=1900,
        to_era=era,
    )
    second_coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=1900,
        from_era=era,
        to_year=1900,
        to_era=era,
    )
    session.add_all([first_coin, second_coin])
    session.commit()

    assert first_coin.id != second_coin.id


def test_coin_relationships_are_available(session: Session) -> None:
    collection, country, denomination, era = make_coin_reference_data(session)

    coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=100,
        from_era=era,
        to_year=200,
        to_era=era,
    )
    session.add(coin)
    session.commit()
    session.refresh(coin)

    assert coin.collection is collection
    assert coin.country is country
    assert coin.denomination is denomination
    assert coin.from_era is era
    assert coin.to_era is era


def test_coin_optional_fields_can_be_empty(session: Session) -> None:
    collection, country, denomination, era = make_coin_reference_data(session)

    coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=2000,
        from_era=era,
        to_year=2000,
        to_era=era,
    )
    session.add(coin)
    session.commit()
    session.refresh(coin)

    assert coin.issuer is None
    assert coin.mint is None
    assert coin.material is None
    assert coin.state is None
    assert coin.description is None
    assert coin.weight is None
    assert coin.diameter is None
    assert coin.source is None


def test_coin_can_be_marked_deleted_and_restored(
    session: Session,
) -> None:
    collection, country, denomination, era = make_coin_reference_data(session)

    coin = Coin(
        collection=collection,
        country=country,
        denomination=denomination,
        from_year=1900,
        from_era=era,
        to_year=1900,
        to_era=era,
    )
    session.add(coin)
    session.commit()

    assert coin.is_deleted is False

    coin.is_deleted = True
    session.commit()
    session.refresh(coin)

    assert coin.is_deleted is True

    coin.is_deleted = False
    session.commit()
    session.refresh(coin)

    assert coin.is_deleted is False
