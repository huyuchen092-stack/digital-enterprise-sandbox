from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.api import documents, knowledge, parameters, simulations
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.include_router(documents.router)
app.include_router(knowledge.router)
app.include_router(parameters.router)
app.include_router(simulations.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
