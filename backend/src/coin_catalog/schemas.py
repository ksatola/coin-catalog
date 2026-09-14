from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CoinCreate(BaseModel):
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


class CoinResponse(CoinCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
