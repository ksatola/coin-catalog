from fastapi import FastAPI

from coin_catalog.routes.categories import router as categories_router
from coin_catalog.routes.coin_categories import router as coin_categories_router
from coin_catalog.routes.coins import router as coins_router
from coin_catalog.routes.dictionaries import router as dictionaries_router
from coin_catalog.routes.images import router as images_router

app = FastAPI(title="Coin Catalog API")

app.include_router(coins_router)
app.include_router(dictionaries_router)
app.include_router(categories_router)
app.include_router(coin_categories_router)
app.include_router(images_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
