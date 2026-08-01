import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ParkingItem } from "@/lib/parking/schemas";
import { STORAGE_KEY } from "@/lib/parking/storage";

import { ParkingApp } from "./parking-app";

const NOW = new Date("2026-07-20T06:00:00.000Z");
const analysis = {
  title: "Example Tool",
  summary: "A focused tool summary.",
  effortTier: "quick_spin",
  suggestedTestTask: "Run one sample through the tool.",
  usefulnessHypothesis: "It may shorten a repeated review step.",
};
const classification = {
  suggestedKind: "ai_tool",
  rationale: "Reads as software you would operate.",
};

function storedItems(): ParkingItem[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).parkingItems;
}

describe("ParkingApp live analysis", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "client-owned-id"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the submitted URL while loading and blocks duplicate submissions", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    const input = await screen.findByLabelText("AI tool URL");
    await user.type(input, "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(
      screen.getByText("Analyzing https://example.com/tool…"),
    ).toBeVisible();
    expect(input).toBeDisabled();
    expect(screen.getByRole("button", { name: "Analyze & Park" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveResponse(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    });
    expect(
      await screen.findByRole("button", { name: "Example Tool, Parked" }),
    ).toBeVisible();
  });

  it("switches capture modes by keyboard across all three tabs without writing anything", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal("fetch", vi.fn());
    render(<ParkingApp />);

    const toolTab = await screen.findByRole("tab", { name: "Park tool" });
    const readTab = screen.getByRole("tab", { name: "Park read" });
    const ideaTab = screen.getByRole("tab", { name: "Park idea" });
    expect(toolTab).toHaveAttribute("aria-selected", "true");

    toolTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(readTab).toHaveFocus();
    expect(readTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Read URL")).toBeVisible();

    await user.keyboard("{ArrowRight}");
    expect(ideaTab).toHaveFocus();
    expect(ideaTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Idea title")).toBeVisible();

    await user.keyboard("{ArrowRight}");
    expect(toolTab).toHaveFocus();
    expect(toolTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("AI tool URL")).toBeVisible();

    expect(fetch).not.toHaveBeenCalled();
    expect(storedItems()).toHaveLength(3);
  });

  it("clears a typed URL and drops an in-flight request when switching capture mode", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    const toolInput = await screen.findByLabelText("AI tool URL");
    await user.type(toolInput, "https://example.com/tool");
    expect(toolInput).toHaveValue("https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("tab", { name: "Park read" }));
    await user.click(screen.getByRole("tab", { name: "Park tool" }));

    expect(screen.getByLabelText("AI tool URL")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Analyze & Park" })).toBeEnabled();
  });

  it("states the roadmap as a note instead of dead controls", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<ParkingApp />);
    await screen.findByRole("tab", { name: "Park tool" });

    expect(screen.queryByRole("button", { name: /Future/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Planned for later releases/)).toBeVisible();
  });

  it("keeps one Idea record through planning, Test Drive, evidence, and Garage", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal("fetch", vi.fn());
    render(<ParkingApp />);

    await user.click(await screen.findByRole("tab", { name: "Park idea" }));
    await user.type(screen.getByLabelText("Idea title"), "Decision receipt");
    await user.type(
      screen.getByLabelText("Idea"),
      "Record the decision and its owner before a meeting ends.",
    );
    await user.click(screen.getByRole("button", { name: "Park Idea" }));

    await user.click(
      await screen.findByRole("button", { name: "Decision receipt, Parked" }),
    );
    await user.selectOptions(screen.getByLabelText("Effort tier"), "quick_spin");
    await user.type(
      screen.getByLabelText("First test task"),
      "Capture one decision in the next meeting.",
    );
    await user.click(screen.getByRole("button", { name: "Save planning" }));

    expect(storedItems().filter(({ id }) => id === "client-owned-id")).toEqual([
      expect.objectContaining({
        id: "client-owned-id",
        kind: "idea",
        status: "parked",
        effortTier: "quick_spin",
        suggestedTestTask: "Capture one decision in the next meeting.",
      }),
    ]);

    await user.click(screen.getByRole("button", { name: "Start Test Drive" }));
    expect(await screen.findByText("Test Driving")).toBeVisible();
    await user.type(screen.getByLabelText("Test notes"), "The owner confirmed the record.");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    await user.click(screen.getByRole("tab", { name: "Garage 2" }));
    expect(
      await screen.findByRole("button", { name: "Decision receipt, Garaged" }),
    ).toBeVisible();
    const records = storedItems().filter(({ id }) => id === "client-owned-id");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      kind: "idea",
      status: "garaged",
      notes: "The owner confirmed the record.",
    });
  });

  it("stops forcing planning focus once the patrol prompt has been handled", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            recommendations: [
              {
                itemId: "client-owned-id",
                suggestedAction: "start_test_drive",
                rationale: "Plan one bounded test before this is forgotten.",
                source: "model",
              },
            ],
          }),
        ),
      ),
    );
    render(<ParkingApp />);

    await user.click(await screen.findByRole("tab", { name: "Park idea" }));
    await user.type(screen.getByLabelText("Idea title"), "Decision receipt");
    await user.type(
      screen.getByLabelText("Idea"),
      "Record one decision before the meeting ends.",
    );
    await user.click(screen.getByRole("button", { name: "Park Idea" }));

    await user.click(screen.getByRole("button", { name: "Run Manager Patrol" }));
    await user.click(await screen.findByRole("button", { name: "Plan Test Drive" }));
    expect(screen.getByLabelText("Effort tier")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Close inspector" }));

    await user.click(
      await screen.findByRole("button", { name: "Decision receipt, Parked" }),
    );

    expect(screen.getByLabelText("Effort tier")).not.toHaveFocus();
  });

  it("tows one unplanned Idea directly into the shared Scrapyard", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal("fetch", vi.fn());
    render(<ParkingApp />);

    await user.click(await screen.findByRole("tab", { name: "Park idea" }));
    await user.type(screen.getByLabelText("Idea title"), "Too broad to test");
    await user.type(screen.getByLabelText("Idea"), "A deliberately unplanned idea.");
    await user.click(screen.getByRole("button", { name: "Park Idea" }));
    await user.click(
      await screen.findByRole("button", { name: "Too broad to test, Parked" }),
    );
    await user.click(screen.getByRole("button", { name: "Tow Away" }));
    await user.type(
      screen.getByLabelText("Decision reason"),
      "No bounded experiment can be defined yet.",
    );
    await user.click(screen.getByRole("button", { name: "Confirm Tow Away" }));

    await user.click(screen.getByRole("tab", { name: "Scrapyard 1" }));
    expect(
      await screen.findByRole("button", { name: "Too broad to test, Scrapped" }),
    ).toBeVisible();
    const records = storedItems().filter(({ id }) => id === "client-owned-id");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      kind: "idea",
      status: "scrapped",
      finalDecisionReason: "No bounded experiment can be defined yet.",
    });
  });

  it("creates exactly one client-owned parked item from a valid response", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification,
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await screen.findByRole("button", { name: "Example Tool, Parked" });

    const created = storedItems().filter(({ id }) => id === "client-owned-id");
    expect(created).toEqual([
      expect.objectContaining({
        ...analysis,
        id: "client-owned-id",
        url: "https://example.com/tool",
        kind: "ai_tool",
        status: "parked",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        lastActivityAt: expect.any(String),
      }),
    ]);
    expect(created[0].updatedAt).toBe(created[0].createdAt);
    expect(created[0].lastActivityAt).toBe(created[0].createdAt);
    expect(new Date(created[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      NOW.getTime(),
    );
    expect(storedItems()).toHaveLength(4);
  });

  it("preserves the URL after an API error and allows a retry", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: "Live AI is temporarily unavailable." },
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    const input = await screen.findByLabelText("AI tool URL");
    await user.type(input, "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(
      await screen.findByText("Live AI is temporarily unavailable. Try again shortly."),
    ).toBeVisible();
    expect(input).toHaveValue("https://example.com/tool");
    expect(screen.getByRole("button", { name: "Analyze & Park" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await screen.findByRole("button", { name: "Example Tool, Parked" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("shows a visible URL-only warning after a successful fallback", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "url_only",
          warning:
            "Page text could not be fetched, so this analysis uses the URL only.",
          classification,
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(
      await screen.findByText(
        "Page text could not be fetched, so this analysis uses the URL only.",
      ),
    ).toBeVisible();
  });

  it("rejects extra server-owned item fields without persisting a partial item", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "fetched",
          id: "server-controlled-id",
          status: "garaged",
          createdAt: "2000-01-01T00:00:00.000Z",
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The analysis response could not be verified. Try again.",
    );
    await waitFor(() => {
      expect(storedItems().some(({ id }) => id === "server-controlled-id")).toBe(false);
    });
  });

  it("renders the read form rather than falling through to the Idea form", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal("fetch", vi.fn());
    render(<ParkingApp />);

    await user.click(await screen.findByRole("tab", { name: "Park read" }));

    expect(screen.getByLabelText("Read URL")).toBeVisible();
    expect(screen.queryByLabelText("Idea title")).not.toBeInTheDocument();
  });
});

describe("ParkingApp mis-park advisory ownership (residual fix P1/P2)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "client-owned-id"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // P1, required test: parking under one kind with a mismatched
  // classification must produce an advisory that SURVIVES a capture-mode
  // switch, because switching mode used to remount (and destroy) the form
  // that owned the advisory. It is the only affordance anywhere in the app
  // that can change an item's kind, so this must not be lost to ordinary
  // navigation.
  it("keeps the mis-park advisory visible after switching capture mode", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Park read" }));
    await user.click(screen.getByRole("tab", { name: "Park tool" }));

    expect(screen.getByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();
  });

  // P2, required test (a): a transient re-park failure (429 quota gate) must
  // NOT drop the advisory — the item is still re-parkable, so the button
  // must stay clickable for a retry.
  it("keeps the mis-park advisory button after a 429 re-park failure", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: "Too many requests." },
          { status: 429, headers: { "retry-after": "5" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park Example Tool as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 5 seconds.",
    );
    expect(screen.getByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();
  });

  // P2 (superseded by Finding 3 this round): this used to prove that
  // clicking a doomed "Re-park as …" button after a tow produced a clear
  // explanation, relying on reparkItem's live terminal check. Finding 3
  // replaces that reactive handling with a proactive one — an item's
  // advisory is now dropped the instant the item reaches a terminal status,
  // so the doomed button (and the click that used to trigger the
  // explanation) never exists in the first place. The original intent —
  // "an advisory tied to a towed item must not survive" — still holds and is
  // verified here; it just happens earlier now, with no failure message
  // needed because no failing request is ever attempted. The store's own
  // terminal refusal (reason: "terminal") remains covered directly in
  // use-parking-store.test.tsx, independent of this UI path.
  it("drops the mis-park advisory as soon as the item is towed away, without waiting for a doomed re-park click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        analysis,
        sourceMode: "fetched",
        classification: { suggestedKind: "read", rationale: "Long-form prose." },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    await user.click(
      await screen.findByRole("button", { name: "Example Tool, Parked" }),
    );
    await user.click(screen.getByRole("button", { name: "Tow Away" }));
    await user.type(
      screen.getByLabelText("Decision reason"),
      "No longer relevant after review.",
    );
    await user.click(screen.getByRole("button", { name: "Confirm Tow Away" }));

    // Gone immediately — no click on a doomed button required.
    expect(
      screen.queryByRole("button", { name: "Re-park Example Tool as Read" }),
    ).not.toBeInTheDocument();
    // Only the one fetch (analyze) was ever made; no re-park attempt fires
    // against an item that is already terminal.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Finding 3 (superseded from Finding 2 last round): the OLD test here
  // proved onReparkFailed's decision came from reparkItem's own live check
  // rather than a stale items snapshot, by towing WHILE the re-park request
  // was still in flight and waiting for the store to refuse the write. That
  // race is now avoided altogether: towing evicts the advisory (and, via its
  // unmount cleanup, aborts the in-flight request) the instant the item goes
  // terminal, so the late-arriving response must land as a genuine no-op —
  // no resurrected advisory, no error, nothing written for it.
  it("evicts the advisory and aborts its in-flight re-park the instant the item is towed away, so the late response is a no-op", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveRepark!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRepark = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    // Start the re-park — the response will not arrive until we resolve it
    // below, deliberately keeping it in flight through the tow.
    await user.click(screen.getByRole("button", { name: "Re-park Example Tool as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Re-parking…" })).toBeVisible();

    // Tow the item away WHILE that request is still pending.
    await user.click(
      await screen.findByRole("button", { name: "Example Tool, Parked" }),
    );
    await user.click(screen.getByRole("button", { name: "Tow Away" }));
    await user.type(
      screen.getByLabelText("Decision reason"),
      "Superseded while the re-park was in flight.",
    );
    await user.click(screen.getByRole("button", { name: "Confirm Tow Away" }));

    // The advisory (in-flight state and all) is gone immediately — no need
    // to wait for the response.
    expect(
      screen.queryByRole("button", { name: /Re-park Example Tool as Read|Re-parking…/ }),
    ).not.toBeInTheDocument();

    // Now let the in-flight re-park response arrive late. It must be inert:
    // no resurrected advisory, no failure notice, nothing left over.
    await act(async () => {
      resolveRepark(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      );
    });

    expect(
      screen.queryByRole("button", { name: /Re-park Example Tool as Read|Re-parking…/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/towed away, so it can no longer be re-parked/),
    ).not.toBeInTheDocument();
    const records = storedItems().filter(({ id }) => id === "client-owned-id");
    expect(records[0]).toMatchObject({ status: "scrapped" });
  });

  // Finding 2 also affects Reset demo data: it replaces every item wholesale,
  // so an in-flight re-park targets an id that no longer exists in the fresh
  // seed data the instant reset runs.
  it("clears the advisory when Reset demo data is confirmed while its re-park is still in flight", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveRepark!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRepark = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Re-park Example Tool as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "Reset demo data settings" }));
    await user.click(screen.getByRole("button", { name: "Reset demo data" }));

    expect(
      screen.queryByRole("button", { name: /Re-park Example Tool as Read|Re-parking…/ }),
    ).not.toBeInTheDocument();

    // The now-orphaned response must not resurrect anything about an item
    // that has nothing to do with the fresh demo data.
    await act(async () => {
      resolveRepark(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      );
    });

    expect(
      screen.queryByRole("button", { name: /Re-park Example Tool as Read|Re-parking…/ }),
    ).not.toBeInTheDocument();
    expect(storedItems()).toHaveLength(3);
  });

  // Finding 3: mispark-advisory.tsx queues its URL-only warning and then
  // calls onReparked(null) when the new classification agrees — but
  // ParkingApp wires onReparked to drop the advisory, unmounting the
  // component that was about to show that warning in the very same tick.
  it("shows the URL-only re-park warning even though the agreeing re-park drops the advisory (Finding 3)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "url_only",
          warning:
            "Page text could not be fetched, so this analysis uses the URL only.",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park Example Tool as Read" }));

    // Matched as a substring (not exact text) because Finding 1 (this round)
    // now prefixes every warning with its item's identity so it stays
    // attributable across concurrent advisories — see the "Finding 1" describe
    // block below.
    expect(
      await screen.findByText(/Page text could not be fetched, so this analysis uses the URL only\./),
    ).toBeVisible();
    // The advisory really is gone (the model now agrees) — proving the
    // warning is no longer coming from the component that just unmounted.
    expect(
      screen.queryByRole("button", { name: /Re-park Example Tool as Read|Re-parking…/ }),
    ).not.toBeInTheDocument();
  });
});

describe("ParkingApp concurrent mis-park advisories (Finding 1)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    let idCount = 0;
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => `item-${++idCount}`),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function parkTool(user: ReturnType<typeof userEvent.setup>, url: string, title: string) {
    const input = await screen.findByLabelText("AI tool URL");
    await user.clear(input);
    await user.type(input, url);
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await screen.findByRole("button", { name: `${title}, Parked` });
  }

  // Finding 1, order A: item A's re-park is still in flight when item B is
  // parked and ALSO mis-parks. A single advisory slot would have had item
  // B's advisory silently replace (and unmount, aborting) item A's — this
  // proves both survive, and that resolving A's in-flight response afterward
  // still lands correctly without disturbing B.
  it("keeps both advisories when B mis-parks while A's re-park is in flight, and A resolves after B appears", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveReparkA!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveReparkA = resolve;
          }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool B" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose B." },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await parkTool(user, "https://example.com/a", "Tool A");
    await user.click(screen.getByRole("button", { name: "Re-park Tool A as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Re-parking…" })).toBeVisible();

    await parkTool(user, "https://example.com/b", "Tool B");

    // A's advisory must still be there (mid-request), alongside B's own,
    // untouched advisory.
    expect(screen.getByRole("button", { name: "Re-parking…" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Re-park Tool B as Read" })).toBeVisible();
    expect(screen.getByText("Long-form prose B.")).toBeVisible();

    await act(async () => {
      resolveReparkA(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      );
    });

    // A agreed, so A's advisory is gone; B's is untouched and still the only
    // one left.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Re-parking…" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Re-park Tool B as Read" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Re-park Tool A as Read" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Long-form prose B.")).toBeVisible();
  });

  // Finding 1, order B: the reverse completion order — B's own re-park
  // resolves while A's is still in flight. Resolving B must not disturb A's
  // still-pending advisory.
  it("keeps A's advisory in flight and unaffected when B's own re-park resolves first", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveReparkA!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveReparkA = resolve;
          }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool B" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose B." },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool B" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose B." },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await parkTool(user, "https://example.com/a", "Tool A");
    await user.click(screen.getByRole("button", { name: "Re-park Tool A as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Re-parking…" })).toBeVisible();

    await parkTool(user, "https://example.com/b", "Tool B");
    expect(screen.getByRole("button", { name: "Re-park Tool B as Read" })).toBeVisible();

    // Resolve B's own re-park (agreeing) — it should complete and disappear
    // without touching A's still-pending advisory.
    await user.click(screen.getByRole("button", { name: "Re-park Tool B as Read" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Re-park Tool B as Read" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Re-parking…" })).toBeVisible();

    // Clean up A's still-pending request so it doesn't leak into another
    // test; confirm it still lands correctly and unaffected by B's history.
    await act(async () => {
      resolveReparkA(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      );
    });
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Re-parking…" })).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: /Re-park Tool [AB] as Read/ }),
    ).not.toBeInTheDocument();
  });

  // Finding 1 (this round): the URL-only re-park warning used to live in one
  // shared scalar, set from whichever re-park completed most recently. With
  // two concurrent advisories, item B's fetched (no-warning) completion would
  // call setReparkWarning(null) and erase item A's url-only warning — even
  // though A's warning has nothing to do with B. The warning must be keyed by
  // item id, exactly like the advisories themselves, and each one rendered
  // with its own item's identity so it is attributable.
  it("keeps item A's url-only re-park warning after item B's own re-park completes fetched (no warning)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveReparkA!: (response: Response) => void;
    let resolveReparkB!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      // Park A (mis-parks to read)
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      )
      // A's own re-park — deferred
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveReparkA = resolve;
          }),
      )
      // Park B (mis-parks to read)
      .mockResolvedValueOnce(
        Response.json({
          analysis: { ...analysis, title: "Tool B" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose B." },
        }),
      )
      // B's own re-park — deferred
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveReparkB = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(<ParkingApp />);

    await parkTool(user, "https://example.com/a", "Tool A");
    await user.click(screen.getByRole("button", { name: "Re-park Tool A as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    await parkTool(user, "https://example.com/b", "Tool B");
    await user.click(screen.getByRole("button", { name: "Re-park Tool B as Read" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));

    // A's re-park lands first: it agrees (drops the advisory) and reports a
    // URL-only warning.
    await act(async () => {
      resolveReparkA(
        Response.json({
          analysis: { ...analysis, title: "Tool A" },
          sourceMode: "url_only",
          warning: "Page text could not be fetched, so this analysis uses the URL only.",
          classification: { suggestedKind: "read", rationale: "Long-form prose A." },
        }),
      );
    });
    // The warning is rendered attributed to its own item (Finding 1: keyed
    // by item id, not a shared scalar), not as a bare, unattributed message.
    expect(
      await screen.findByText(
        "Tool A: Page text could not be fetched, so this analysis uses the URL only.",
      ),
    ).toBeVisible();

    // B's re-park lands second: it also agrees (drops the advisory) but was
    // fetched cleanly, so it carries no warning at all.
    await act(async () => {
      resolveReparkB(
        Response.json({
          analysis: { ...analysis, title: "Tool B" },
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose B." },
        }),
      );
    });

    // B completing warning-free must NOT erase A's still-relevant warning —
    // proving the warning is keyed per item rather than a single shared
    // last-writer-wins slot — and it must remain attributable to Tool A.
    expect(
      screen.getByText(
        "Tool A: Page text could not be fetched, so this analysis uses the URL only.",
      ),
    ).toBeVisible();
  });
});

describe("ParkingApp advisory lifecycle (Finding 3)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "client-owned-id"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // The exact reachable sequence from the finding: park a tool, get an
  // advisory, open the card, and move the item to the Garage through the
  // ordinary inspector flow (Start Test Drive, then Park in Garage). Nothing
  // here ever clicks "Re-park …" — the advisory must be gone on its own,
  // because reparkItem refuses a garaged item forever.
  it("drops the mis-park advisory once its item is parked in the Garage via the ordinary inspector flow", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    await user.click(
      await screen.findByRole("button", { name: "Example Tool, Parked" }),
    );
    await user.click(screen.getByRole("button", { name: "Start Test Drive" }));
    await user.type(screen.getByLabelText("Test notes"), "Confirmed it does what it claims.");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    expect(
      screen.queryByRole("button", { name: "Re-park Example Tool as Read" }),
    ).not.toBeInTheDocument();
  });

  // Finding 3's other requirement: an explicit, always-available dismiss
  // control, wired all the way through ParkingApp (not just the isolated
  // MisparkAdvisory unit).
  it("dismisses an advisory via its own dismiss control, leaving the item itself untouched", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      ),
    );
    render(<ParkingApp />);

    await user.type(await screen.findByLabelText("AI tool URL"), "https://example.com/tool");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByRole("button", { name: "Re-park Example Tool as Read" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss Example Tool advisory" }));

    expect(
      screen.queryByRole("button", { name: "Re-park Example Tool as Read" }),
    ).not.toBeInTheDocument();
    const records = storedItems().filter(({ id }) => id === "client-owned-id");
    expect(records[0]).toMatchObject({ status: "parked", kind: "ai_tool" });
  });
});
