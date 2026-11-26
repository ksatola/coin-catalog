import base64
import binascii
import json
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, or_

from coin_catalog.coin_sorting import (
    SortCriterion,
    cursor_json_value,
    cursor_python_value,
    sort_expression,
)
from coin_catalog.models import Coin


@dataclass(frozen=True)
class CoinCursor:
    sort_spec: tuple[SortCriterion, ...]
    sort_values: tuple[object | None, ...]
    coin_id: int


def encode_cursor(cursor: CoinCursor) -> str:
    payload = {
        "version": 2,
        "sort": [[item.key, item.direction] for item in cursor.sort_spec],
        "values": [cursor_json_value(value) for value in cursor.sort_values],
        "coin_id": cursor.coin_id,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8"),
    )
    return encoded.rstrip(b"=").decode("ascii")


def decode_cursor(
    value: str,
    sort_spec: tuple[SortCriterion, ...],
) -> CoinCursor:
    try:
        padded = value + "=" * (-len(value) % 4)
        payload = json.loads(
            base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"),
        )
        if payload.get("version") != 2:
            raise ValueError("Unsupported cursor version")
        cursor_spec = tuple(
            SortCriterion(key, direction) for key, direction in payload["sort"]
        )
        raw_values = payload["values"]
        coin_id = payload["coin_id"]
        if cursor_spec != sort_spec or len(raw_values) != len(sort_spec):
            raise ValueError("Cursor sort mismatch")
        if isinstance(coin_id, bool) or not isinstance(coin_id, int) or coin_id <= 0:
            raise ValueError("Invalid coin ID")
        values = tuple(
            cursor_python_value(item.key, raw)
            for item, raw in zip(sort_spec, raw_values, strict=True)
        )
        if "id" in (item.key for item in sort_spec):
            id_index = next(
                index for index, item in enumerate(sort_spec) if item.key == "id"
            )
            if values[id_index] != coin_id:
                raise ValueError("Cursor ID mismatch")
        return CoinCursor(sort_spec, values, coin_id)
    except (
        AttributeError,
        binascii.Error,
        KeyError,
        TypeError,
        ValueError,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cursor",
        ) from None


def cursor_for_coin(
    coin: Coin,
    sort_spec: tuple[SortCriterion, ...],
) -> CoinCursor:
    from coin_catalog.coin_sorting import cursor_value

    return CoinCursor(
        sort_spec=sort_spec,
        sort_values=tuple(cursor_value(coin, item.key) for item in sort_spec),
        coin_id=coin.id,
    )


def _cursor_condition(cursor: CoinCursor, *, after: bool):
    alternatives = []
    prefix = []
    for item, value in zip(cursor.sort_spec, cursor.sort_values, strict=True):
        expression = sort_expression(item.key)
        ascending = item.direction == "asc"
        if after:
            if value is None:
                branch = None
                equal = expression.is_(None)
            else:
                branch = expression > value if ascending else expression < value
                branch = or_(branch, expression.is_(None))
                equal = expression == value
        elif value is None:
            branch = expression.is_not(None)
            equal = expression.is_(None)
        else:
            branch = expression < value if ascending else expression > value
            equal = expression == value

        if branch is not None:
            alternatives.append(and_(*prefix, branch))
        prefix.append(equal)

    return or_(*alternatives)


def apply_after_cursor(
    statement: Select[tuple[Coin]],
    cursor: CoinCursor,
) -> Select[tuple[Coin]]:
    return statement.where(_cursor_condition(cursor, after=True))


def apply_before_cursor(
    statement: Select[tuple[Coin]],
    cursor: CoinCursor,
) -> Select[tuple[Coin]]:
    return statement.where(_cursor_condition(cursor, after=False))
