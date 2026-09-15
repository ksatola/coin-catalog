from collections.abc import Sequence

from sqlalchemy import Select, String, cast, exists, or_, select

from coin_catalog.models import (
    Category,
    CategoryRelation,
    Coin,
    CoinCategory,
    CoinImage,
    Country,
    Denomination,
    Era,
    Issuer,
    Material,
    Mint,
    State,
)


def _category_descendants(
    category_ids: Sequence[int],
    include_children: bool,
    name_pattern: str | None = None,
):
    if name_pattern is None:
        seed = select(Category.id.label("category_id")).where(
            Category.id.in_(category_ids),
        )
    else:
        seed = select(Category.id.label("category_id")).where(
            Category.name.ilike(name_pattern),
        )

    closure = seed.cte(recursive=True)
    if include_children:
        descendants = select(CategoryRelation.child_id.label("category_id")).join(
            closure,
            CategoryRelation.parent_id == closure.c.category_id,
        )
        closure = closure.union_all(descendants)

    return closure


def _category_exists_for_coin(
    category_ids: Sequence[int],
    include_children: bool,
):
    closure = _category_descendants(category_ids, include_children)
    return exists(
        select(CoinCategory.coin_id)
        .join(closure, CoinCategory.category_id == closure.c.category_id)
        .where(CoinCategory.coin_id == Coin.id)
    )


def _category_search_exists_for_coin(token: str, include_children: bool):
    pattern = f"%{token}%"
    closure = _category_descendants([], include_children, pattern)
    return exists(
        select(CoinCategory.coin_id)
        .join(closure, CoinCategory.category_id == closure.c.category_id)
        .where(CoinCategory.coin_id == Coin.id)
    )


def _dictionary_search_exists_for_coin(column, pattern: str):
    return exists(
        select(column).where(
            column.ilike(pattern),
        )
    )


def _text_search_condition(token: str, include_category_children: bool):
    pattern = f"%{token}%"
    return or_(
        _dictionary_search_exists_for_coin(
            select(Country.name).where(Country.id == Coin.country_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Issuer.name).where(Issuer.id == Coin.issuer_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Denomination.name).where(Denomination.id == Coin.denomination_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Mint.name).where(Mint.id == Coin.mint_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Material.name).where(Material.id == Coin.material_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(State.name).where(State.id == Coin.state_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Era.name).where(Era.id == Coin.from_era_id).scalar_subquery(),
            pattern,
        ),
        _dictionary_search_exists_for_coin(
            select(Era.name).where(Era.id == Coin.to_era_id).scalar_subquery(),
            pattern,
        ),
        Coin.description.ilike(pattern),
        Coin.source.ilike(pattern),
        cast(Coin.from_year, String).ilike(pattern),
        cast(Coin.to_year, String).ilike(pattern),
        _category_search_exists_for_coin(token, include_category_children),
    )


def build_coin_query(
    *,
    search: str | None = None,
    country_ids: Sequence[int] | None = None,
    issuer_ids: Sequence[int] | None = None,
    denomination_ids: Sequence[int] | None = None,
    mint_ids: Sequence[int] | None = None,
    material_ids: Sequence[int] | None = None,
    state_ids: Sequence[int] | None = None,
    era_ids: Sequence[int] | None = None,
    category_ids: Sequence[int] | None = None,
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    has_image: bool | None = None,
    has_video: bool | None = None,
    status_filter: str = "active",
    sort_by: str = "id",
    sort_order: str = "asc",
) -> Select[tuple[Coin]]:
    statement = select(Coin)

    if status_filter == "active":
        statement = statement.where(Coin.is_deleted.is_(False))
    elif status_filter == "archived":
        statement = statement.where(Coin.is_deleted.is_(True))

    if search:
        tokens = [token for token in search.split() if token]
        for token in tokens:
            statement = statement.where(
                _text_search_condition(token, include_category_children)
            )

    id_filters = (
        (Coin.country_id, country_ids),
        (Coin.issuer_id, issuer_ids),
        (Coin.denomination_id, denomination_ids),
        (Coin.mint_id, mint_ids),
        (Coin.material_id, material_ids),
        (Coin.state_id, state_ids),
    )
    for column, values in id_filters:
        if values:
            statement = statement.where(column.in_(values))

    if era_ids:
        statement = statement.where(
            or_(Coin.from_era_id.in_(era_ids), Coin.to_era_id.in_(era_ids))
        )

    if category_ids:
        statement = statement.where(
            _category_exists_for_coin(category_ids, include_category_children)
        )

    if from_year is not None:
        statement = statement.where(Coin.to_year >= from_year)

    if to_year is not None:
        statement = statement.where(Coin.from_year <= to_year)

    if has_video is not None:
        statement = statement.where(Coin.has_video.is_(has_video))

    if has_image is not None:
        image_exists = exists(select(CoinImage.id).where(CoinImage.coin_id == Coin.id))
        statement = statement.where(image_exists if has_image else ~image_exists)

    sort_columns = {
        "id": Coin.id,
        "from_year": Coin.from_year,
        "to_year": Coin.to_year,
    }
    sort_column = sort_columns.get(sort_by, Coin.id)
    statement = statement.distinct().order_by(
        sort_column.desc() if sort_order == "desc" else sort_column.asc(),
        Coin.id.asc(),
    )

    return statement
