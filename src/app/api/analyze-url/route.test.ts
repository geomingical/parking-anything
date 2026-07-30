import { describe, expect, it, vi } from "vitest";

import type { AnalyzeUrlResponse } from "@/lib/parking/schemas";
import { HttpError } from "@/lib/server/request";

import { createAnalyzeRoute } from "./route";

const response: AnalyzeUrlResponse = {
  analysis: {
    title: "Example Tool",
    summary: "A focused tool summary.",
    effortTier: "quick_spin",
    suggestedTestTask: "Run one sample through the tool.",
    usefulnessHypothesis: "It may shorten a repeated review step.",
  },
  sourceMode: "fetched",
  classification: { suggestedKind: "ai_tool", rationale: "Operable API." },
};

function post(body: unknown, headers?: HeadersInit) {
  return new Request("https://parking.test/api/analyze-url", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("createAnalyzeRoute", () => {
  it("consumes quota before analysis and returns only the analysis DTO", async () => {
    const order: string[] = [];
    const quotaGate = {
      consume: vi.fn(async () => {
        order.push("quota");
      }),
    };
    const analyze = vi.fn(async () => {
      order.push("analyze");
      return response;
    });
    const route = createAnalyzeRoute({ quotaGate, analyze });

    const result = await route(
      post(
        { url: "https://example.com/tool" },
        { "x-forwarded-for": "203.0.113.4, 198.51.100.9" },
      ),
    );
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(order).toEqual(["quota", "analyze"]);
    expect(quotaGate.consume).toHaveBeenCalledWith({ ip: "203.0.113.4" });
    expect(body).toEqual(response);
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("status");
    expect(body).not.toHaveProperty("createdAt");
  });

  it.each([
    [{}, "Enter one valid public HTTP(S) URL."],
    [{ url: "https://example.com", extra: true }, "Enter one valid public HTTP(S) URL."],
    [{ url: "x".repeat(2_049) }, "Enter one valid public HTTP(S) URL."],
  ])("returns 400 for an invalid input schema", async (body, message) => {
    const analyze = vi.fn();
    const route = createAnalyzeRoute({
      quotaGate: { consume: vi.fn(async () => undefined) },
      analyze,
    });

    const result = await route(post(body));

    expect(result.status).toBe(400);
    await expect(result.json()).resolves.toEqual({ error: message });
    expect(analyze).not.toHaveBeenCalled();
  });

  it.each([
    [429, 42, "Demo request limit reached."],
    [503, undefined, "Live AI is temporarily unavailable."],
  ])("preserves quota error status %i", async (status, retryAfter, message) => {
    const analyze = vi.fn();
    const route = createAnalyzeRoute({
      quotaGate: {
        consume: vi.fn(async () => {
          throw new HttpError(status, message, retryAfter);
        }),
      },
      analyze,
    });

    const result = await route(post({ url: "https://example.com/tool" }));

    expect(result.status).toBe(status);
    expect(result.headers.get("retry-after")).toBe(
      retryAfter ? String(retryAfter) : null,
    );
    await expect(result.json()).resolves.toEqual({ error: message });
    expect(analyze).not.toHaveBeenCalled();
  });

  it("passes the requested kind through to the analyzer", async () => {
    const seen: Array<{ url: string; kind: string }> = [];
    const POST = createAnalyzeRoute({
      quotaGate: { consume: async () => undefined },
      analyze: async (request) => {
        seen.push(request);
        return {
          analysis: {
            title: "On craft",
            summary: "Argues small details compound.",
            effortTier: "focused_session",
            suggestedTestTask: "Pick one detail.",
            usefulnessHypothesis: "May sharpen the next pass.",
          },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Prose." },
        };
      },
    });

    const response = await POST(
      new Request("https://app.test/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/a", kind: "read" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(seen).toEqual([{ url: "https://example.com/a", kind: "read" }]);
  });

  it("defaults the kind to ai_tool when omitted", async () => {
    const seen: Array<{ url: string; kind: string }> = [];
    const POST = createAnalyzeRoute({
      quotaGate: { consume: async () => undefined },
      analyze: async (request) => {
        seen.push(request);
        return {
          analysis: {
            title: "Summariser",
            summary: "Summarises documents.",
            effortTier: "quick_spin",
            suggestedTestTask: "Summarise one document.",
            usefulnessHypothesis: "May cut a review step.",
          },
          sourceMode: "fetched",
          classification: { suggestedKind: "ai_tool", rationale: "Operable API." },
        };
      },
    });

    await POST(
      new Request("https://app.test/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/t" }),
      }),
    );

    expect(seen[0].kind).toBe("ai_tool");
  });

  it("rejects an unregistered kind", async () => {
    const POST = createAnalyzeRoute({
      quotaGate: { consume: async () => undefined },
      analyze: async () => {
        throw new Error("must not be called");
      },
    });

    const response = await POST(
      new Request("https://app.test/api/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/a", kind: "podcast" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
