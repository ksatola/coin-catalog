from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coin_catalog.database import Base


class Country(Base):
    __tablename__ = "country"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="country")


class Issuer(Base):
    __tablename__ = "issuer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="issuer")


class Denomination(Base):
    __tablename__ = "denomination"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="denomination")


class Mint(Base):
    __tablename__ = "mint"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="mint")


class Material(Base):
    __tablename__ = "material"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="material")


class State(Base):
    __tablename__ = "state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list[Coin]] = relationship(back_populates="state")


class Era(Base):
    __tablename__ = "era"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    from_coins: Mapped[list[Coin]] = relationship(
        back_populates="from_era",
        foreign_keys="Coin.from_era_id",
    )
    to_coins: Mapped[list[Coin]] = relationship(
        back_populates="to_era",
        foreign_keys="Coin.to_era_id",
    )


class Collection(Base):
    __tablename__ = "collection"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    coin_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    archived_coin_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    category_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coins_without_images_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )
    last_modified_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    coins: Mapped[list[Coin]] = relationship(back_populates="collection")


class Category(Base):
    __tablename__ = "category"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    parents: Mapped[list[Category]] = relationship(
        "Category",
        secondary="category_relation",
        primaryjoin="Category.id == CategoryRelation.child_id",
        secondaryjoin="Category.id == CategoryRelation.parent_id",
        back_populates="children",
    )
    children: Mapped[list[Category]] = relationship(
        "Category",
        secondary="category_relation",
        primaryjoin="Category.id == CategoryRelation.parent_id",
        secondaryjoin="Category.id == CategoryRelation.child_id",
        back_populates="parents",
    )
    coins: Mapped[list[Coin]] = relationship(
        "Coin",
        secondary="coin_category",
        back_populates="categories",
    )


class CategoryRelation(Base):
    __tablename__ = "category_relation"

    parent_id: Mapped[int] = mapped_column(
        ForeignKey("category.id", ondelete="CASCADE"),
        primary_key=True,
    )
    child_id: Mapped[int] = mapped_column(
        ForeignKey("category.id", ondelete="CASCADE"),
        primary_key=True,
    )

    __table_args__ = (
        CheckConstraint("parent_id <> child_id", name="ck_category_relation_not_self"),
    )


class CoinCategory(Base):
    __tablename__ = "coin_category"

    coin_id: Mapped[int] = mapped_column(
        ForeignKey("coin.id", ondelete="CASCADE"),
        primary_key=True,
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("category.id", ondelete="CASCADE"),
        primary_key=True,
    )


class CoinImage(Base):
    __tablename__ = "coin_image"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    coin_id: Mapped[int] = mapped_column(
        ForeignKey("coin.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('avers', 'rewers', 'additional')",
            name="ck_coin_image_kind",
        ),
        UniqueConstraint(
            "coin_id",
            "kind",
            "sort_order",
            name="uq_coin_image_order",
        ),
    )

    coin: Mapped[Coin] = relationship(back_populates="images")


class Coin(Base):
    __tablename__ = "coin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    collection_id: Mapped[int] = mapped_column(
        ForeignKey("collection.id", ondelete="RESTRICT"),
        nullable=False,
    )
    collection_number: Mapped[str | None] = mapped_column(Text)
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    country_id: Mapped[int] = mapped_column(ForeignKey("country.id"), nullable=False)
    issuer_id: Mapped[int | None] = mapped_column(ForeignKey("issuer.id"))
    denomination_id: Mapped[int] = mapped_column(
        ForeignKey("denomination.id"), nullable=False
    )
    from_year: Mapped[int] = mapped_column(Integer, nullable=False)
    from_era_id: Mapped[int] = mapped_column(ForeignKey("era.id"), nullable=False)
    to_year: Mapped[int] = mapped_column(Integer, nullable=False)
    to_era_id: Mapped[int] = mapped_column(ForeignKey("era.id"), nullable=False)
    mint_id: Mapped[int | None] = mapped_column(ForeignKey("mint.id"))
    material_id: Mapped[int | None] = mapped_column(ForeignKey("material.id"))
    state_id: Mapped[int | None] = mapped_column(ForeignKey("state.id"))
    description: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[Decimal | None] = mapped_column(Numeric)
    diameter: Mapped[Decimal | None] = mapped_column(Numeric)
    has_video: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    collection: Mapped[Collection] = relationship(back_populates="coins")
    country: Mapped[Country] = relationship(back_populates="coins")
    issuer: Mapped[Issuer | None] = relationship(back_populates="coins")
    denomination: Mapped[Denomination] = relationship(back_populates="coins")
    from_era: Mapped[Era] = relationship(
        back_populates="from_coins",
        foreign_keys=[from_era_id],
    )
    to_era: Mapped[Era] = relationship(
        back_populates="to_coins",
        foreign_keys=[to_era_id],
    )
    mint: Mapped[Mint | None] = relationship(back_populates="coins")
    material: Mapped[Material | None] = relationship(back_populates="coins")
    state: Mapped[State | None] = relationship(back_populates="state")
    categories: Mapped[list[Category]] = relationship(
        "Category",
        secondary="coin_category",
        back_populates="coins",
    )
    images: Mapped[list[CoinImage]] = relationship(
        back_populates="coin",
        cascade="all, delete-orphan",
        order_by="CoinImage.sort_order",
    )
