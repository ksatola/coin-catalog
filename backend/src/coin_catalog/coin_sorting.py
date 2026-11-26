from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import Select, case, select
from sqlalchemy.sql.elements import ColumnElement

from coin_catalog.models import Coin, Country, Denomination, Era, Issuer, Material, Mint

@dataclass(frozen=True)
class SortCriterion:
    key: str
    direction: str

SORT_FIELDS = {
    "id", "collection_number", "from_year", "to_year",
    "created_at", "updated_at", "purchase_date",
    "country", "issuer", "denomination", "material", "mint",
}
RELATION_FIELDS = {
    "country": (Country, Coin.country_id),
    "issuer": (Issuer, Coin.issuer_id),
    "denomination": (Denomination, Coin.denomination_id),
    "material": (Material, Coin.material_id),
    "mint": (Mint, Coin.mint_id),
}
COIN_ATTRIBUTES = {
    "id": Coin.id,
    "collection_number": Coin.collection_number,
    "created_at": Coin.created_at,
    "updated_at": Coin.updated_at,
    "purchase_date": Coin.purchase_date,
}

def normalize_sort_spec(sort_by: Sequence[str] | None, sort_order: Sequence[str] | None) -> tuple[SortCriterion, ...]:
    fields = list(sort_by or ["id"])
    directions = list(sort_order or ["asc"])
    if len(fields) != len(directions) or not fields:
        raise HTTPException(status_code=400, detail="Sort fields and directions must have matching lengths")
    if any(field not in SORT_FIELDS for field in fields):
        raise HTTPException(status_code=400, detail="Invalid sort field")
    if any(direction not in {"asc", "desc"} for direction in directions):
        raise HTTPException(status_code=400, detail="Invalid sort order")
    if len(set(fields)) != len(fields):
        raise HTTPException(status_code=400, detail="Duplicate sort field")
    if "id" in fields and fields[-1] != "id":
        raise HTTPException(status_code=400, detail="ID must be the final sort criterion")
    if fields[-1] != "id":
        fields.append("id")
        directions.append("asc")
    return tuple(SortCriterion(key, direction) for key, direction in zip(fields, directions, strict=True))

def sort_expression(key: str) -> ColumnElement:
    if key in COIN_ATTRIBUTES:
        return COIN_ATTRIBUTES[key]
    if key in RELATION_FIELDS:
        model, foreign_key = RELATION_FIELDS[key]
        return select(model.name).where(model.id == foreign_key).correlate(Coin).scalar_subquery()
    if key in {"from_year", "to_year"}:
        year_column = Coin.from_year if key == "from_year" else Coin.to_year
        era_column = Coin.from_era_id if key == "from_year" else Coin.to_era_id
        era_name = select(Era.name).where(Era.id == era_column).correlate(Coin).scalar_subquery()
        return case(
            (era_name == "p.n.e.", -year_column),
            (era_name == "n.e.", year_column),
            else_=None,
        )
    raise ValueError(f"Unsupported sort key: {key}")

def apply_sorting(statement: Select, sort_spec: Sequence[SortCriterion]) -> Select:
    ordering = []
    for item in sort_spec:
        expression = sort_expression(item.key)
        ordering.append(expression.asc().nulls_last() if item.direction == "asc" else expression.desc().nulls_last())
    return statement.order_by(None).order_by(*ordering)

def cursor_value(coin: Coin, key: str):
    if key in {"id", "collection_number", "created_at", "updated_at", "purchase_date"}:
        return getattr(coin, key)
    if key in RELATION_FIELDS:
        relation = getattr(coin, key)
        return relation.name if relation is not None else None
    if key in {"from_year", "to_year"}:
        year = getattr(coin, key)
        era = getattr(coin, "from_era" if key == "from_year" else "to_era")
        if year is None or era is None:
            return None
        if era.name == "p.n.e.":
            return -year
        if era.name == "n.e.":
            return year
        return None
    raise ValueError(f"Unsupported cursor key: {key}")

def cursor_json_value(value):
    return value.isoformat() if isinstance(value, (date, datetime)) else value

def cursor_python_value(key: str, value):
    if value is None:
        return None
    if key in {"created_at", "updated_at"}:
        return datetime.fromisoformat(value)
    if key == "purchase_date":
        return date.fromisoformat(value)
    if key in {"id", "from_year", "to_year"}:
        if isinstance(value, bool) or not isinstance(value, int):
            raise ValueError("Invalid numeric cursor value")
        return value
    if not isinstance(value, str):
        raise ValueError("Invalid text cursor value")
    return value


def apply_reverse_sorting(statement: Select, sort_spec: Sequence[SortCriterion]) -> Select:
    ordering = []
    for item in sort_spec:
        expression = sort_expression(item.key)
        ordering.append(expression.desc().nulls_first() if item.direction == "asc" else expression.asc().nulls_first())
    return statement.order_by(None).order_by(*ordering)
