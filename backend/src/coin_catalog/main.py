from fastapi import FastAPI

from coin_catalog.routes.coins import router as coins_router
from coin_catalog.routes.dictionaries import router as dictionaries_router

app = FastAPI(title="Coin Catalog API")

app.include_router(coins_router)
app.include_router(dictionaries_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
