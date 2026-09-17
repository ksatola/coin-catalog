import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import inspect

from coin_catalog.database import SessionLocal, engine, initialize_database
from coin_catalog.image_storage import ensure_image_storage
from coin_catalog.routes.categories import router as categories_router
from coin_catalog.routes.coin_categories import router as coin_categories_router
from coin_catalog.routes.coins import router as coins_router
from coin_catalog.routes.collections import router as collections_router
from coin_catalog.routes.dictionaries import router as dictionaries_router
from coin_catalog.routes.images import router as images_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    del app
    initialize_database()

    if inspect(engine).has_table("collection"):
        with SessionLocal() as session:
            issues = ensure_image_storage(session)
            if issues:
                logger.warning(
                    "Application started with %d image storage consistency issue(s)",
                    len(issues),
                )
    else:
        logger.warning(
            "Collection table is unavailable; run Alembic migrations before using collection image storage"
        )

    yield


app = FastAPI(title="Coin Catalog API", lifespan=lifespan)

app.include_router(coins_router)
app.include_router(dictionaries_router)
app.include_router(categories_router)
app.include_router(coin_categories_router)
app.include_router(collections_router)
app.include_router(images_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
