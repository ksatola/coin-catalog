from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from coin_catalog.database import Base
from coin_catalog.models import (
    Category,
    CategoryRelation,
    Coin,
    CoinCategory,
    CoinImage,
    Country,
    Denomination,
    Era,
)


@pytest.fixture
def session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine)()

    try:
        yield test_session
    finally:
        test_session.close()
        engine.dispose()


def make_coin(session: Session) -> Coin:
    country = Country(name="Test Country")
    denomination = Denomination(name="Test Denomination")
    era = Era(name="CE")
    session.add_all([country, denomination, era])
    session.commit()

    coin = Coin(
        country_id=country.id,
        denomination_id=denomination.id,
        from_year=1900,
        from_era_id=era.id,
        to_year=1900,
        to_era_id=era.id,
    )
    session.add(coin)
    session.commit()
    session.refresh(coin)
    return coin


def test_new_domain_tables_are_present() -> None:
    table_names = set(Base.metadata.tables)

    assert {
        "category",
        "category_relation",
        "coin_category",
        "coin_image",
    }.issubset(table_names)


def test_category_has_expected_columns_and_unique_name() -> None:
    table = Category.__table__

    assert set(table.columns.keys()) == {
        "id",
        "name",
        "description",
        "created_at",
        "updated_at",
    }
    assert table.c.name.nullable is False
    assert table.c.name.unique is True


def test_category_relation_has_composite_primary_key_and_self_relation_check() -> None:
    table = CategoryRelation.__table__

    assert set(table.primary_key.columns.keys()) == {"parent_id", "child_id"}
    assert len(table.constraints) >= 1
    assert any(
        "parent_id <> child_id" in str(constraint.sqltext)
        for constraint in table.constraints
        if hasattr(constraint, "sqltext")
    )


def test_coin_category_has_composite_primary_key() -> None:
    table = CoinCategory.__table__

    assert set(table.primary_key.columns.keys()) == {"coin_id", "category_id"}
    foreign_keys = {foreign_key.target_fullname for foreign_key in table.foreign_keys}
    assert foreign_keys == {"coin.id", "category.id"}


def test_coin_image_has_expected_columns_and_kind_constraint() -> None:
    table = CoinImage.__table__

    assert set(table.columns.keys()) == {
        "id",
        "coin_id",
        "filename",
        "kind",
        "sort_order",
        "created_at",
    }
    assert table.c.coin_id.nullable is False
    assert table.c.filename.nullable is False
    assert table.c.filename.unique is True
    assert table.c.kind.nullable is False
    assert table.c.sort_order.nullable is False
    assert any(
        "kind IN ('avers', 'rewers', 'additional')" in str(constraint.sqltext)
        for constraint in table.constraints
        if hasattr(constraint, "sqltext")
    )


def test_category_and_coin_relationships_work(session: Session) -> None:
    coin = make_coin(session)
    parent = Category(name="Parent")
    child = Category(name="Child")
    session.add_all([parent, child])
    session.commit()

    child.parents.append(parent)
    coin.categories.extend([parent, child])
    session.commit()

    session.refresh(child)
    session.refresh(parent)
    session.refresh(coin)

    assert parent in child.parents
    assert child in parent.children
    assert parent in coin.categories
    assert child in coin.categories
    assert coin in parent.coins


def test_coin_image_relationship_works(session: Session) -> None:
    coin = make_coin(session)
    image = CoinImage(
        coin_id=coin.id,
        filename=f"{coin.id:06d} - awers.jpg",
        kind="avers",
        sort_order=0,
    )
    coin.images.append(image)
    session.commit()
    session.refresh(coin)

    assert coin.images == [image]
    assert image.coin is coin


def test_category_relation_rejects_self_reference(session: Session) -> None:
    category = Category(name="Self")
    session.add(category)
    session.commit()

    session.add(CategoryRelation(parent_id=category.id, child_id=category.id))

    with pytest.raises(IntegrityError):
        session.commit()


def test_coin_image_filename_is_unique(session: Session) -> None:
    coin = make_coin(session)
    first = CoinImage(
        coin_id=coin.id,
        filename=f"{coin.id:06d} - 01.jpg",
        kind="additional",
        sort_order=0,
    )
    second = CoinImage(
        coin_id=coin.id,
        filename=f"{coin.id:06d} - 01.jpg",
        kind="additional",
        sort_order=1,
    )
    session.add(first)
    session.commit()
    session.add(second)

    with pytest.raises(IntegrityError):
        session.commit()


def test_new_tables_have_expected_foreign_keys() -> None:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    inspector = inspect(engine)

    try:
        category_relation_fks = {
            foreign_key["referred_table"]
            for foreign_key in inspector.get_foreign_keys("category_relation")
        }
        coin_category_fks = {
            foreign_key["referred_table"]
            for foreign_key in inspector.get_foreign_keys("coin_category")
        }
        coin_image_fks = {
            foreign_key["referred_table"]
            for foreign_key in inspector.get_foreign_keys("coin_image")
        }
    finally:
        engine.dispose()

    assert category_relation_fks == {"category"}
    assert coin_category_fks == {"coin", "category"}
    assert coin_image_fks == {"coin"}
