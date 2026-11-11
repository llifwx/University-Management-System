import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.responses import JSONResponse

from app.api.v1.router import router
from app.core.config import get_settings
from app.core.exceptions import install_handlers
from app.db.session import engine
from app.modules.auth.service import purge_expired

logger = logging.getLogger("university")
logging.basicConfig(level=logging.INFO, format="%(message)s")


async def purge_auth_rows():
    while True:
        try:
            await purge_expired()
        except Exception:
            logger.exception("Purging expired sessions failed")
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    purger = asyncio.create_task(purge_auth_rows())
    yield
    purger.cancel()
    await engine.dispose()


app = FastAPI(title="University Management System", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)
install_handlers(app)
app.include_router(router)


@app.middleware("http")
async def request_log(request: Request, call_next):
    request_id = str(uuid4())
    started = time.monotonic()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    logger.info(
        json.dumps(
            {
                "event": "http_request",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "duration_ms": round((time.monotonic() - started) * 1000, 2),
            }
        )
    )
    return response


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}


@app.get("/ready", tags=["Health"])
async def ready():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return {"status": "ready"}
    except SQLAlchemyError:
        return JSONResponse(
            status_code=503,
            content={
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Database is not ready.",
                }
            },
        )
