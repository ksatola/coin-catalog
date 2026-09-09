from fastapi import FastAPI

app = FastAPI(title="Coin Catalog API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
