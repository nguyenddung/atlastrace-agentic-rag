import { describe, expect, it } from "vitest";
import { checkRateLimit, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./rate-limit";

describe("rate limiter", () => {
  it("allows requests under the window limit", () => {
    const key = `under-limit-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      expect(checkRateLimit(key, 0).allowed).toBe(true);
    }
  });

  it("blocks a request once the window limit is exceeded", () => {
    const key = `over-limit-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) checkRateLimit(key, 0);
    const blocked = checkRateLimit(key, 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets once the window has elapsed", () => {
    const key = `resets-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) checkRateLimit(key, 0);
    expect(checkRateLimit(key, 0).allowed).toBe(false);
    expect(checkRateLimit(key, RATE_LIMIT_WINDOW_MS).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const a = `key-a-${Math.random()}`;
    const b = `key-b-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) checkRateLimit(a, 0);
    expect(checkRateLimit(a, 0).allowed).toBe(false);
    expect(checkRateLimit(b, 0).allowed).toBe(true);
  });
});
