from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from coin_catalog.database import Base


class Country(Base):
    __tablename__ = "country"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="country")


class Issuer(Base):
    __tablename__ = "issuer"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="issuer")


class Denomination(Base):
    __tablename__ = "denomination"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="denomination")


class Mint(Base):
    __tablename__ = "mint"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="mint")


class Material(Base):
    __tablename__ = "material"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="material")


class State(Base):
    __tablename__ = "state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    coins: Mapped[list["Coin"]] = relationship(back_populates="state")


class Era(Base):
    __tablename__ = "era"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)

    from_coins: Mapped[list["Coin"]] = relationship(
        back_populates="from_era",
        foreign_keys="Coin.from_era_id",
    )
    to_coins: Mapped[list["Coin"]] = relationship(
        back_populates="to_era",
        foreign_keys="Coin.to_era_id",
    )


class Coin(Base):
    __tablename__ = "coin"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
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
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)

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
    state: Mapped[State | None] = relationship(back_populates="coins")
