import base64
import json
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, or_

from coin_catalog.models import Coin


@dataclass(frozen=True)
class CoinCursor:
    sort_by: str
    sort_order: str
    sort_value: int | None
    coin_id: int


def encode_cursor(cursor: CoinCursor) -> str:
    payload = {
        "sort_by": cursor.sort_by,
        "sort_order": cursor.sort_order,
        "sort_value": cursor.sort_value,
        "coin_id": cursor.coin_id,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8"),
    )
    return encoded.rstrip(b"=").decode("ascii")


def decode_cursor(value: str, sort_by: str, sort_order: str) -> CoinCursor:
    try:
        padded = value + "=" * (-len(value) % 4)
        payload = json.loads(
            base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8"),
        )
        cursor = CoinCursor(
            sort_by=payload["sort_by"],
            sort_order=payload["sort_order"],
            sort_value=payload["sort_value"],
            coin_id=payload["coin_id"],
        )
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cursor",
        ) from None

    if cursor.sort_by != sort_by or cursor.sort_order != sort_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cursor does not match sorting",
        )

    if not isinstance(cursor.coin_id, int) or cursor.coin_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cursor",
        )

    if cursor.sort_value is not None and not isinstance(cursor.sort_value, int):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid cursor",
        )

    return cursor


def apply_after_cursor(
    statement: Select[tuple[Coin]],
    cursor: CoinCursor,
) -> Select[tuple[Coin]]:
    column = {
        "id": Coin.id,
        "from_year": Coin.from_year,
        "to_year": Coin.to_year,
    }[cursor.sort_by]

    if cursor.sort_by == "id":
        condition = (
            Coin.id > cursor.coin_id
            if cursor.sort_order == "asc"
            else Coin.id < cursor.coin_id
        )
        return statement.where(condition)

    if cursor.sort_order == "asc":
        if cursor.sort_value is None:
            condition = or_(
                column.is_not(None),
                and_(column.is_(None), Coin.id > cursor.coin_id),
            )
        else:
            condition = or_(
                column > cursor.sort_value,
                and_(column == cursor.sort_value, Coin.id > cursor.coin_id),
            )
    else:
        if cursor.sort_value is None:
            condition = and_(column.is_(None), Coin.id > cursor.coin_id)
        else:
            condition = or_(
                column < cursor.sort_value,
                column.is_(None),
                and_(column == cursor.sort_value, Coin.id > cursor.coin_id),
            )

    return statement.where(condition)


def apply_before_cursor(
    statement: Select[tuple[Coin]],
    cursor: CoinCursor,
) -> Select[tuple[Coin]]:
    column = {
        "id": Coin.id,
        "from_year": Coin.from_year,
        "to_year": Coin.to_year,
    }[cursor.sort_by]

    if cursor.sort_by == "id":
        condition = (
            Coin.id < cursor.coin_id
            if cursor.sort_order == "asc"
            else Coin.id > cursor.coin_id
        )
        return statement.where(condition)

    if cursor.sort_order == "asc":
        if cursor.sort_value is None:
            condition = and_(column.is_(None), Coin.id < cursor.coin_id)
        else:
            condition = or_(
                column < cursor.sort_value,
                column.is_(None),
                and_(column == cursor.sort_value, Coin.id < cursor.coin_id),
            )
    else:
        if cursor.sort_value is None:
            condition = or_(
                column.is_not(None),
                and_(column.is_(None), Coin.id < cursor.coin_id),
            )
        else:
            condition = or_(
                column > cursor.sort_value,
                and_(column == cursor.sort_value, Coin.id < cursor.coin_id),
            )

    return statement.where(condition)
