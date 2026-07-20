import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";

import { ManagerPatrol } from "./manager-patrol";

describe("ManagerPatrol", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows deterministic all-clear without making a request", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const terminalItems = makeSeedItems().map((item) => ({
      ...item,
      status: "garaged",
    })) as ParkingItem[];
    render(<ManagerPatrol items={terminalItems} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));

    expect(screen.getByText("All clear. No active tools need attention.")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends at most three deterministic candidates without local evidence", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const base = makeSeedItems()[0];
    const items: ParkingItem[] = [
      ...makeSeedItems(),
      ...[2, 3, 4].map((day) => ({
        ...base,
        id: `extra-${day}`,
        title: `Extra ${day}`,
        lastActivityAt: `2026-07-0${day}T00:00:00.000Z`,
        notes: "must stay local",
      })),
    ];
    const fetchMock = vi.fn(async () =>
      Response.json({ recommendations: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ManagerPatrol items={items} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.candidates).toHaveLength(3);
    expect(JSON.stringify(body)).not.toContain("must stay local");
    expect(body.candidates[0]).toMatchObject({
      id: "seed-stale",
      daysSinceActivity: 48,
    });
  });

  it("renders deterministic observation separately from GPT-5.6 judgment", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          recommendations: [
            {
              itemId: "seed-stale",
              suggestedAction: "start_test_drive",
              rationale: "Give this a bounded trial today.",
              source: "model",
            },
          ],
        }),
      ),
    );
    render(<ManagerPatrol items={makeSeedItems()} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));

    const row = await screen.findByRole("article", {
      name: "Patrol recommendation for OpenAI Platform Docs",
    });
    expect(within(row).getByText("Observed Fact")).toBeVisible();
    expect(
      within(row).getByText(
        "This tool has been parked without activity for 48 days.",
      ),
    ).toBeVisible();
    expect(within(row).getByText("GPT-5.6 Recommendation")).toBeVisible();
    expect(within(row).getByText("Give this a bounded trial today.")).toBeVisible();

    await user.click(within(row).getByRole("button", { name: "Review this car" }));
    expect(onSelect).toHaveBeenCalledWith("seed-stale");
  });

  it("labels fallback provenance and never presents it as GPT-5.6 output", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          recommendations: [
            {
              itemId: "seed-stale",
              suggestedAction: "scrap",
              rationale: "Clear the slot if it no longer deserves a test.",
              source: "fallback",
            },
          ],
        }),
      ),
    );
    render(<ManagerPatrol items={makeSeedItems()} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));

    const row = await screen.findByRole("article", {
      name: "Patrol recommendation for OpenAI Platform Docs",
    });
    expect(within(row).getByText("Observed Fact")).toBeVisible();
    expect(within(row).getByText("Deterministic fallback")).toBeVisible();
    expect(within(row).queryByText("GPT-5.6 Recommendation")).not.toBeInTheDocument();
  });

  it.each([
    [429, "Demo request limit reached. Try again in 42 seconds."],
    [503, "Live AI is temporarily unavailable. Try again shortly."],
  ])("shows actionable availability text for status %i without changing items", async (status, message) => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const items = makeSeedItems();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error:
              status === 429
                ? "Demo request limit reached."
                : "Live AI is temporarily unavailable.",
          },
          {
            status,
            headers: status === 429 ? { "retry-after": "42" } : undefined,
          },
        ),
      ),
    );
    render(<ManagerPatrol items={items} onSelect={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(items).toEqual(makeSeedItems());
  });
});
