from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CollectionCreate(BaseModel):
    name: str
    description: str | None = None


class CollectionStatsResponse(BaseModel):
    coin_count: int
    archived_coin_count: int
    image_count: int
    file_size_bytes: int
    category_count: int
    coins_without_images_count: int
    last_modified_at: datetime


class CollectionResponse(CollectionCreate, CollectionStatsResponse):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CoinCreate(BaseModel):
    collection_id: int
    collection_number: str | None = None
    country_id: int
    issuer_id: int | None = None
    denomination_id: int
    from_year: int | None = None
    from_era_id: int | None = None
    to_year: int | None = None
    to_era_id: int | None = None
    mint_id: int | None = None
    material_id: int | None = None
    state_id: int | None = None
    description: str | None = None
    weight: Decimal | None = None
    diameter: Decimal | None = None
    has_video: bool = False
    source: str | None = None
    avers_description: str | None = None
    revers_description: str | None = None
    literature: str | None = None
    acquisition_method_id: int | None = None
    acquisition_method_text: str | None = None
    purchase_price: Decimal | None = None
    purchase_date: date | None = None


class CoinUpdate(CoinCreate):
    pass


class CoinMoveRequest(BaseModel):
    target_collection_id: int


class CoinResponse(CoinCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class CoinListImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    revision: int


class CoinListResponse(CoinResponse):
    images: list[CoinListImageResponse] = Field(default_factory=list)


class CoinPageResponse(BaseModel):
    items: list[CoinListResponse]
    next_cursor: str | None
    has_more: bool


class CoinNavigationResponse(BaseModel):
    previous_id: int | None
    next_id: int | None


class DictionaryItemCreate(BaseModel):
    name: str


class DictionaryItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


class CategoryResponse(CategoryCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CategoryGraphItem(CategoryResponse):
    parent_ids: list[int] = Field(default_factory=list)
    child_ids: list[int] = Field(default_factory=list)


class CoinImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    coin_id: int
    filename: str
    kind: str
    sort_order: int
    file_size_bytes: int
    revision: int
    thumbnail_revision: int | None
    thumbnail_generator_version: int | None
    created_at: datetime
