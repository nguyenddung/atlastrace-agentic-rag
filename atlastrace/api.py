"""FastAPI app serving the research pipeline at /api/research."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from .graph import run_research
from .retrieval import get_index
from .schemas import ResearchRequest

RATE_LIMIT_WINDOW_S = 60.0
RATE_LIMIT_MAX_REQUESTS = 20

ERRORS = {
    "en": {
        "length": "Ask a specific question between 12 and 500 characters.",
        "rate": "Too many requests. Wait a moment before running another query.",
        "generic": "Research run failed",
    },
    "vi": {
        "length": "Hãy đặt một câu hỏi cụ thể dài từ 12 đến 500 ký tự.",
        "rate": "Quá nhiều yêu cầu. Hãy chờ một chút trước khi chạy truy vấn khác.",
        "generic": "Lượt nghiên cứu thất bại",
    },
}


class RateLimiter:
    """In-memory fixed window per client.

    Best effort on serverless: state resets on cold start and is not shared
    between instances. Enough to blunt accidental loops against the public demo;
    real traffic needs a shared store (Redis / Vercel KV) behind check().
    """

    def __init__(self, limit: int = RATE_LIMIT_MAX_REQUESTS, window: float = RATE_LIMIT_WINDOW_S):
        self.limit, self.window = limit, window
        self.buckets: dict[str, tuple[int, float]] = {}

    def check(self, key: str, now: float | None = None) -> float:
        """Return 0 if allowed, otherwise the seconds to wait."""
        now = time.monotonic() if now is None else now
        if len(self.buckets) > 5000:
            self.buckets = {k: v for k, v in self.buckets.items() if now - v[1] < self.window}
        count, start = self.buckets.get(key, (0, now))
        if now - start >= self.window:
            count, start = 0, now
        if count >= self.limit:
            return self.window - (now - start)
        self.buckets[key] = (count + 1, start)
        return 0.0


@asynccontextmanager
async def lifespan(_: FastAPI):
    get_index()  # build the BM25/vector index before the first request
    yield


app = FastAPI(title="AtlasTrace API", docs_url="/api/docs", openapi_url="/api/openapi.json", lifespan=lifespan)
limiter = RateLimiter()


def _locale(body: Any) -> str:
    locale = body.get("locale") if isinstance(body, dict) else None
    return locale if locale in ERRORS else "en"


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    return forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse({"error": ERRORS[_locale(exc.body)]["length"]}, status_code=400)


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "passages": len(get_index().docs) // 2}


@app.post("/api/research")
async def research(payload: ResearchRequest, request: Request) -> JSONResponse:
    wait = limiter.check(_client_key(request))
    if wait:
        return JSONResponse({"error": ERRORS[payload.locale]["rate"]}, status_code=429, headers={"Retry-After": str(int(wait) + 1)})
    try:
        result = await run_in_threadpool(run_research, payload.question.strip(), payload.locale, payload.mode)
    except Exception:
        return JSONResponse({"error": ERRORS[payload.locale]["generic"]}, status_code=500)
    return JSONResponse(result.model_dump(by_alias=True, exclude_none=True), headers={"Cache-Control": "no-store"})
