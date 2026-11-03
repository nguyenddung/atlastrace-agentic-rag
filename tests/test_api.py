from fastapi.testclient import TestClient

from atlastrace.api import RateLimiter, app

client = TestClient(app)


def test_research_endpoint_returns_camel_case_result():
    response = client.post("/api/research", json={"question": "How many points did the Panthers defense surrender?", "mode": "demo", "locale": "en"})
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "demo"
    assert {"verdict", "answer", "citations", "trace", "metrics"} <= body.keys()
    assert {"documentsScanned", "critiqueRounds", "totalDurationMs", "queryCoverage"} <= body["metrics"].keys()
    assert body["trace"][0]["durationMs"] >= 1
    assert response.headers["cache-control"] == "no-store"


def test_short_question_is_rejected_with_localized_error():
    response = client.post("/api/research", json={"question": "ngắn", "locale": "vi"})
    assert response.status_code == 400
    assert "12" in response.json()["error"]


def test_health():
    assert client.get("/api/health").json()["passages"] == 240


def test_rate_limiter_blocks_after_limit_and_resets():
    limiter = RateLimiter(limit=2, window=60)
    assert limiter.check("ip", now=0) == 0
    assert limiter.check("ip", now=1) == 0
    assert limiter.check("ip", now=2) > 0
    assert limiter.check("ip", now=61) == 0
