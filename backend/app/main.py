from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import browse, composers, import_, search, stream, works
from app.config import settings

app = FastAPI(title="Köchel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(composers.router, prefix="/api/v1")
app.include_router(works.router, prefix="/api/v1")
app.include_router(browse.router, prefix="/api/v1")
app.include_router(stream.router, prefix="/api/v1")
app.include_router(import_.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
