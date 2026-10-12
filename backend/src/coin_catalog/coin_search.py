from collections.abc import Sequence

from sqlalchemy import Select, String, and_, cast, exists, or_, select

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


def _dictionary_search_exists_for_coin(model, coin_column, pattern: str):
    return exists(
        select(1)
        .select_from(model)
        .where(
            model.name.ilike(pattern),
            model.id == coin_column,
        )
    )


def _era_search_exists_for_coin(coin_column, pattern: str):
    return exists(
        select(1)
        .select_from(Era)
        .where(
            Era.name.ilike(pattern),
            Era.id == coin_column,
        )
    )


def _text_search_condition(token: str, include_category_children: bool):
    pattern = f"%{token}%"
    return or_(
        Coin.collection_number.ilike(pattern),
        _dictionary_search_exists_for_coin(Country, Coin.country_id, pattern),
        _dictionary_search_exists_for_coin(Issuer, Coin.issuer_id, pattern),
        _dictionary_search_exists_for_coin(Denomination, Coin.denomination_id, pattern),
        _dictionary_search_exists_for_coin(Mint, Coin.mint_id, pattern),
        _dictionary_search_exists_for_coin(Material, Coin.material_id, pattern),
        _dictionary_search_exists_for_coin(State, Coin.state_id, pattern),
        _era_search_exists_for_coin(Coin.from_era_id, pattern),
        _era_search_exists_for_coin(Coin.to_era_id, pattern),
        Coin.description.ilike(pattern),
        Coin.source.ilike(pattern),
        cast(Coin.from_year, String).ilike(pattern),
        cast(Coin.to_year, String).ilike(pattern),
        _category_search_exists_for_coin(token, include_category_children),
    )


def build_coin_query(
    *,
    search: str | None = None,
    search_mode: str = "include",
    quick_search: str | None = None,
    quick_search_mode: str = "include",
    collection_ids: Sequence[int] | None = None,
    country_ids: Sequence[int] | None = None,
    country_mode: str = "include",
    issuer_ids: Sequence[int] | None = None,
    issuer_mode: str = "include",
    denomination_ids: Sequence[int] | None = None,
    denomination_mode: str = "include",
    mint_ids: Sequence[int] | None = None,
    mint_mode: str = "include",
    material_ids: Sequence[int] | None = None,
    material_mode: str = "include",
    state_ids: Sequence[int] | None = None,
    state_mode: str = "include",
    era_ids: Sequence[int] | None = None,
    era_mode: str = "include",
    category_ids: Sequence[int] | None = None,
    category_mode: str = "include",
    include_category_children: bool = True,
    from_year: int | None = None,
    to_year: int | None = None,
    year_mode: str = "include",
    has_image: bool | None = None,
    image_mode: str = "include",
    has_video: bool | None = None,
    video_mode: str = "include",
    status_filter: str = "active",
    sort_by: str = "id",
    sort_order: str = "asc",
) -> Select[tuple[Coin]]:
    statement = select(Coin)

    if status_filter == "active":
        statement = statement.where(Coin.is_deleted.is_(False))
    elif status_filter == "archived":
        statement = statement.where(Coin.is_deleted.is_(True))

    for text, mode in ((search, search_mode), (quick_search, quick_search_mode)):
        if not text:
            continue
        tokens = [token for token in text.split() if token]
        conditions = [
            _text_search_condition(token, include_category_children)
            for token in tokens
        ]
        if conditions:
            if mode == "exclude":
                statement = statement.where(~and_(*conditions))
            else:
                statement = statement.where(and_(*conditions))

    if collection_ids:
        statement = statement.where(Coin.collection_id.in_(collection_ids))

    id_filters = (
        (Coin.country_id, country_ids, country_mode),
        (Coin.issuer_id, issuer_ids, issuer_mode),
        (Coin.denomination_id, denomination_ids, denomination_mode),
        (Coin.mint_id, mint_ids, mint_mode),
        (Coin.material_id, material_ids, material_mode),
        (Coin.state_id, state_ids, state_mode),
    )
    for column, values, mode in id_filters:
        if not values:
            continue
        if mode == "exclude":
            condition = or_(column.not_in(values), column.is_(None))
        else:
            condition = column.in_(values)
        statement = statement.where(condition)

    if era_ids:
        if era_mode == "exclude":
            statement = statement.where(
                and_(
                    or_(Coin.from_era_id.not_in(era_ids), Coin.from_era_id.is_(None)),
                    or_(Coin.to_era_id.not_in(era_ids), Coin.to_era_id.is_(None)),
                )
            )
        else:
            statement = statement.where(
                or_(Coin.from_era_id.in_(era_ids), Coin.to_era_id.in_(era_ids))
            )

    if category_ids:
        category_match = _category_exists_for_coin(
            category_ids, include_category_children
        )
        statement = statement.where(
            ~category_match if category_mode == "exclude" else category_match
        )

    if year_mode == "exclude":
        year_exclusions = []
        if from_year is not None:
            year_exclusions.append(
                or_(Coin.to_year < from_year, Coin.to_year.is_(None))
            )
        if to_year is not None:
            year_exclusions.append(
                or_(Coin.from_year > to_year, Coin.from_year.is_(None))
            )
        if year_exclusions:
            statement = statement.where(or_(*year_exclusions))
    else:
        if from_year is not None:
            statement = statement.where(Coin.to_year >= from_year)
        if to_year is not None:
            statement = statement.where(Coin.from_year <= to_year)

    if has_video is not None:
        video_match = Coin.has_video.is_(has_video)
        statement = statement.where(
            ~video_match if video_mode == "exclude" else video_match
        )

    if has_image is not None:
        image_exists = exists(select(CoinImage.id).where(CoinImage.coin_id == Coin.id))
        image_match = image_exists if has_image else ~image_exists
        statement = statement.where(
            ~image_match if image_mode == "exclude" else image_match
        )

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
