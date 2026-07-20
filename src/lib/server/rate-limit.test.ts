import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  GLOBAL_QUOTA_PREFIX,
  IP_QUOTA_PREFIX,
  createProductionQuotaGate,
  createQuotaGate,
  getClientIp,
  type QuotaLimiter,
} from "./rate-limit";

function limiter(result = { success: true, reset: 0 }): QuotaLimiter {
  return { limit: vi.fn(async () => result) };
}

describe("createQuotaGate", () => {
  it("rejects immediately when the live AI kill switch is disabled", async () => {
    const ipLimiter = limiter();
    const globalLimiter = limiter();
    const gate = createQuotaGate({
      enabled: false,
      hashSecret: "test-secret",
      ipLimiter,
      globalLimiter,
    });

    await expect(gate.consume({ ip: "203.0.113.4" })).rejects.toMatchObject({
      status: 503,
      message: "Live AI is temporarily unavailable.",
    });
    expect(ipLimiter.limit).not.toHaveBeenCalled();
    expect(globalLimiter.limit).not.toHaveBeenCalled();
  });

  it("uses a stable HMAC identifier and never passes the raw IP to a limiter", async () => {
    const ipLimiter = limiter();
    const gate = createQuotaGate({
      hashSecret: "test-secret",
      ipLimiter,
      globalLimiter: limiter(),
    });

    await gate.consume({ ip: "203.0.113.4" });
    await gate.consume({ ip: "203.0.113.4" });

    const expected = createHmac("sha256", "test-secret")
      .update("203.0.113.4")
      .digest("hex");
    expect(ipLimiter.limit).toHaveBeenNthCalledWith(1, expected);
    expect(ipLimiter.limit).toHaveBeenNthCalledWith(2, expected);
    expect(JSON.stringify(vi.mocked(ipLimiter.limit).mock.calls)).not.toContain(
      "203.0.113.4",
    );
  });

  it("returns 429 with retry timing and does not consume global quota after IP rejection", async () => {
    const now = 1_000_000;
    const ipLimiter = limiter({ success: false, reset: now + 42_000 });
    const globalLimiter = limiter();
    const gate = createQuotaGate({
      hashSecret: "test-secret",
      ipLimiter,
      globalLimiter,
      now: () => now,
    });

    await expect(gate.consume({ ip: "203.0.113.4" })).rejects.toMatchObject({
      status: 429,
      message: "Demo request limit reached.",
      retryAfter: 42,
    });
    expect(globalLimiter.limit).not.toHaveBeenCalled();
  });

  it("returns 503 when the global quota is exhausted", async () => {
    const globalLimiter = limiter({ success: false, reset: 86_400_000 });
    const gate = createQuotaGate({
      hashSecret: "test-secret",
      ipLimiter: limiter(),
      globalLimiter,
    });

    await expect(gate.consume({ ip: "203.0.113.4" })).rejects.toMatchObject({
      status: 503,
      message: "Live AI is temporarily unavailable.",
    });
    expect(globalLimiter.limit).toHaveBeenCalledWith("global");
  });

  it("fails closed if either quota backend errors", async () => {
    const failingLimiter: QuotaLimiter = {
      limit: vi.fn(async () => {
        throw new Error("redis unavailable");
      }),
    };
    const gate = createQuotaGate({
      hashSecret: "test-secret",
      ipLimiter: failingLimiter,
      globalLimiter: limiter(),
    });

    await expect(gate.consume({ ip: "203.0.113.4" })).rejects.toMatchObject({
      status: 503,
      message: "Live AI is temporarily unavailable.",
    });
  });
});

describe("createProductionQuotaGate", () => {
  it("fails closed in production when required configuration is missing", () => {
    expect(() =>
      createProductionQuotaGate({
        NODE_ENV: "production",
        DEMO_API_ENABLED: "true",
      }),
    ).toThrow(expect.objectContaining({ status: 503 }));
  });

  it("uses one shared pair of prefixes independent of the calling route", () => {
    expect(IP_QUOTA_PREFIX).toBe("parking-anything:ip");
    expect(GLOBAL_QUOTA_PREFIX).toBe("parking-anything:global");
    expect(IP_QUOTA_PREFIX).not.toContain("analyze");
    expect(IP_QUOTA_PREFIX).not.toContain("patrol");
  });
});

describe("getClientIp", () => {
  it("prefers the first forwarded address", () => {
    const request = new Request("https://parking.test", {
      headers: {
        "x-forwarded-for": "203.0.113.4, 198.51.100.9",
        "x-real-ip": "192.0.2.7",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.4");
  });

  it("falls back to x-real-ip and then unknown", () => {
    expect(
      getClientIp(
        new Request("https://parking.test", {
          headers: { "x-real-ip": "192.0.2.7" },
        }),
      ),
    ).toBe("192.0.2.7");
    expect(getClientIp(new Request("https://parking.test"))).toBe("unknown");
  });
});
