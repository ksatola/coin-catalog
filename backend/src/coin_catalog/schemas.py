from datetime import datetime
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
    from_year: int
    from_era_id: int
    to_year: int
    to_era_id: int
    mint_id: int | None = None
    material_id: int | None = None
    state_id: int | None = None
    description: str | None = None
    weight: Decimal | None = None
    diameter: Decimal | None = None
    has_video: bool = False
    source: str | None = None


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
    created_at: datetime
