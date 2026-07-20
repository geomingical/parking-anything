import { describe, expect, it, vi } from "vitest";

import type {
  ManagerPatrolResponse,
  PatrolCandidate,
} from "@/lib/parking/schemas";
import { HttpError } from "@/lib/server/request";

import { createManagerPatrolRoute } from "./route";

const candidate: PatrolCandidate = {
  id: "a",
  kind: "ai_tool",
  title: "Old parked tool",
  effortTier: "quick_spin",
  status: "parked",
  daysSinceActivity: 30,
};

const patrolResponse: ManagerPatrolResponse = {
  recommendations: [
    {
      itemId: "a",
      suggestedAction: "start_test_drive",
      rationale: "Give it one bounded test.",
      source: "model",
    },
  ],
};

function post(body: unknown) {
  return new Request("https://parking.test/api/manager-patrol", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "203.0.113.5",
    },
    body: JSON.stringify(body),
  });
}

describe("createManagerPatrolRoute", () => {
  it("consumes the shared quota before calling the patrol service", async () => {
    const order: string[] = [];
    const quotaGate = {
      consume: vi.fn(async () => {
        order.push("quota");
      }),
    };
    const patrol = vi.fn(async () => {
      order.push("patrol");
      return patrolResponse;
    });
    const route = createManagerPatrolRoute({ quotaGate, patrol });

    const response = await route(post({ candidates: [candidate] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(patrolResponse);
    expect(order).toEqual(["quota", "patrol"]);
    expect(quotaGate.consume).toHaveBeenCalledWith({ ip: "203.0.113.5" });
    expect(patrol).toHaveBeenCalledWith([candidate]);
  });

  it("returns deterministic all-clear without consuming quota or calling OpenAI", async () => {
    const quotaGate = { consume: vi.fn() };
    const patrol = vi.fn();
    const route = createManagerPatrolRoute({ quotaGate, patrol });

    const response = await route(post({ candidates: [] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ recommendations: [] });
    expect(quotaGate.consume).not.toHaveBeenCalled();
    expect(patrol).not.toHaveBeenCalled();
  });

  it("rejects duplicate candidate IDs before quota or model work", async () => {
    const quotaGate = { consume: vi.fn() };
    const patrol = vi.fn();
    const route = createManagerPatrolRoute({ quotaGate, patrol });

    const response = await route(post({ candidates: [candidate, candidate] }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Submit up to three valid patrol candidates with unique IDs.",
    });
    expect(quotaGate.consume).not.toHaveBeenCalled();
    expect(patrol).not.toHaveBeenCalled();
  });

  it.each([
    { candidates: [{ ...candidate, kind: undefined }] },
    { candidates: [{ ...candidate, daysSinceActivity: -1 }] },
    { candidates: [candidate, { ...candidate, id: "b" }, { ...candidate, id: "c" }, { ...candidate, id: "d" }] },
    { candidates: [{ ...candidate, notes: "must not cross the boundary" }] },
  ])("rejects invalid candidate input", async (body) => {
    const route = createManagerPatrolRoute({
      quotaGate: { consume: vi.fn() },
      patrol: vi.fn(),
    });

    const response = await route(post(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Submit up to three valid patrol candidates with unique IDs.",
    });
  });

  it.each([
    [429, 42, "Demo request limit reached."],
    [503, undefined, "Live AI is temporarily unavailable."],
  ])("preserves quota failure %i without calling patrol", async (status, retryAfter, message) => {
    const patrol = vi.fn();
    const route = createManagerPatrolRoute({
      quotaGate: {
        consume: vi.fn(async () => {
          throw new HttpError(status, message, retryAfter);
        }),
      },
      patrol,
    });

    const response = await route(post({ candidates: [candidate] }));

    expect(response.status).toBe(status);
    expect(response.headers.get("retry-after")).toBe(
      retryAfter ? String(retryAfter) : null,
    );
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(patrol).not.toHaveBeenCalled();
  });
});
