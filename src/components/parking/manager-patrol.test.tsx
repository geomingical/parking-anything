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

    expect(screen.getByText("All clear. No active Parkables need attention.")).toBeVisible();
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

  it("maps an unplanned Idea recommendation to planning without mutating status", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();
    const onPlanTestDrive = vi.fn();
    const onStartTestDrive = vi.fn();
    const idea: ParkingItem = {
      id: "idea-unplanned",
      kind: "idea",
      title: "Reduce meeting drift",
      ideaText: "Capture decisions at the moment they are made.",
      status: "parked",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-07-01T00:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          recommendations: [
            {
              itemId: idea.id,
              suggestedAction: "start_test_drive",
              rationale: "Plan one bounded trial.",
              source: "model",
            },
          ],
        }),
      ),
    );
    render(
      <ManagerPatrol
        items={[idea]}
        onSelect={onSelect}
        onPlanTestDrive={onPlanTestDrive}
        onStartTestDrive={onStartTestDrive}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));
    const row = await screen.findByRole("article", {
      name: `Patrol recommendation for ${idea.title}`,
    });
    expect(within(row).getByText("This idea has been parked without activity for 19 days.")).toBeVisible();

    await user.click(within(row).getByRole("button", { name: "Plan Test Drive" }));

    expect(onPlanTestDrive).toHaveBeenCalledWith(idea.id);
    expect(onStartTestDrive).not.toHaveBeenCalled();
    expect(idea.status).toBe("parked");
  });

  it("starts Test Drive directly when an Idea recommendation is already planned", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onStartTestDrive = vi.fn();
    const idea: ParkingItem = {
      id: "idea-planned",
      kind: "idea",
      title: "Prototype a decision log",
      ideaText: "Try a small structured decision record.",
      effortTier: "quick_spin",
      suggestedTestTask: "Write one decision record after the next meeting.",
      status: "parked",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      lastActivityAt: "2026-07-01T00:00:00.000Z",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          recommendations: [{ itemId: idea.id, suggestedAction: "start_test_drive", rationale: "Run the planned test.", source: "model" }],
        }),
      ),
    );
    render(
      <ManagerPatrol
        items={[idea]}
        onSelect={vi.fn()}
        onPlanTestDrive={vi.fn()}
        onStartTestDrive={onStartTestDrive}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));
    await user.click(await screen.findByRole("button", { name: "Start Test Drive" }));

    expect(onStartTestDrive).toHaveBeenCalledWith(idea.id);
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
