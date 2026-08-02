import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeSeedItems } from "@/lib/parking/fixtures";
import type { ParkingItem } from "@/lib/parking/schemas";
import { ItemInspector } from "./item-inspector";

const evidenceFreeDrive: ParkingItem = {
  ...makeSeedItems()[0],
  status: "test_driving",
  testStartedAt: "2026-07-20T00:00:00.000Z",
};

function renderInspector(
  item: ParkingItem,
  onApplyAction = vi.fn().mockReturnValue({ ok: true }),
  onUpdateEvidence = vi.fn().mockReturnValue({ ok: true }),
  onRepark = vi.fn().mockReturnValue({ ok: true }),
) {
  return {
    onApplyAction,
    onUpdateEvidence,
    onRepark,
    ...render(
      <ItemInspector
        item={item}
        open
        onOpenChange={vi.fn()}
        onApplyAction={onApplyAction}
        onUpdateEvidence={onUpdateEvidence}
        onUpdateIdea={vi.fn().mockReturnValue({ ok: true })}
        onRepark={onRepark}
      />,
    ),
  };
}

describe("ItemInspector", () => {
  it("shows inline Garage validation and preserves draft fields", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn().mockReturnValue({
      ok: false,
      message: "Add a note or result link before parking in the Garage.",
    });
    renderInspector(evidenceFreeDrive, onApplyAction);

    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    expect(
      screen.getByText("Add a note or result link before parking in the Garage."),
    ).toBeVisible();
    expect(screen.getByLabelText("Test notes")).toHaveValue("");
    expect(screen.getByLabelText("Result URL")).toHaveValue("");
  });

  it("requires a decision reason in the Tow Away confirmation", async () => {
    const user = userEvent.setup();
    const onApplyAction = vi.fn().mockReturnValue({
      ok: false,
      message: "Record why this is leaving before towing it away.",
    });
    renderInspector(makeSeedItems()[0], onApplyAction);

    await user.click(screen.getByRole("button", { name: "Tow Away" }));
    await user.click(screen.getByRole("button", { name: "Confirm Tow Away" }));

    expect(
      screen.getByText("Record why this is leaving before towing it away."),
    ).toBeVisible();
    expect(screen.getByLabelText("Decision reason")).toHaveValue("");
  });

  it("submits recorded evidence when parking in the Garage", async () => {
    const user = userEvent.setup();
    const { onApplyAction } = renderInspector(evidenceFreeDrive);

    await user.type(screen.getByLabelText("Test notes"), "Completed the first test.");
    await user.click(screen.getByRole("button", { name: "Park in Garage" }));

    expect(onApplyAction).toHaveBeenCalledWith({
      type: "park_in_garage",
      notes: "Completed the first test.",
      resultUrl: "",
    });
  });

  it("renders Idea content without Tool-only analysis fields", () => {
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows with five users.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };

    renderInspector(idea);

    expect(screen.getByDisplayValue(idea.ideaText)).toBeVisible();
    expect(screen.getByText("Planning needed")).toBeVisible();
    expect(screen.queryByText("What it appears to do")).not.toBeInTheDocument();
    expect(screen.queryByText("Usefulness hypothesis")).not.toBeInTheDocument();
  });

  it("edits evidence for a parked Idea while preserving parked Tool behavior", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-evidence",
      kind: "idea",
      status: "parked",
      title: "Capture evidence early",
      ideaText: "Record useful context before a formal test starts.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const { onUpdateEvidence, unmount } = renderInspector(idea);

    await user.type(screen.getByLabelText("Test notes"), "Early supporting evidence.");
    await user.tab();

    expect(onUpdateEvidence).toHaveBeenCalledWith("Early supporting evidence.", "");
    expect(screen.getByLabelText("Result URL")).toBeVisible();

    unmount();
    renderInspector(makeSeedItems()[0]);
    expect(screen.queryByLabelText("Test notes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Result URL")).not.toBeInTheDocument();
  });

  it("focuses the first missing planning field without starting Test Drive", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const { onApplyAction } = renderInspector(idea);

    await user.click(screen.getByRole("button", { name: "Start Test Drive" }));

    expect(screen.getByLabelText("Effort tier")).toHaveFocus();
    expect(screen.getByText("Add an effort tier and first test task before starting a Test Drive.")).toBeVisible();
    expect(onApplyAction).not.toHaveBeenCalled();
  });

  it("submits valid Idea planning through the shared editor", async () => {
    const user = userEvent.setup();
    const idea: ParkingItem = {
      id: "idea-1",
      kind: "idea",
      status: "parked",
      title: "Compare onboarding flows",
      ideaText: "Prototype both flows.",
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
      lastActivityAt: "2026-07-20T00:00:00.000Z",
    };
    const onUpdateIdea = vi.fn().mockReturnValue({ ok: true });
    render(
      <ItemInspector item={idea} open onOpenChange={vi.fn()} onApplyAction={vi.fn()} onUpdateEvidence={vi.fn()} onUpdateIdea={onUpdateIdea} onRepark={vi.fn()} />,
    );

    await user.selectOptions(screen.getByLabelText("Effort tier"), "focused_session");
    await user.type(screen.getByLabelText("First test task"), "Interview five users.");
    await user.click(screen.getByRole("button", { name: "Save planning" }));

    expect(onUpdateIdea).toHaveBeenCalledWith({
      title: idea.title,
      ideaText: idea.ideaText,
      effortTier: "focused_session",
      suggestedTestTask: "Interview five users.",
    });
  });

  it.each(["garaged", "scrapped"] as const)(
    "offers no state-changing actions for %s items",
    (status) => {
      renderInspector({ ...makeSeedItems()[2], status });

      expect(screen.queryByRole("button", { name: "Start Test Drive" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Return to Parking Lot" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Park in Garage" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tow Away" })).not.toBeInTheDocument();
    },
  );

  it("labels a read's fields with reading wording", () => {
    const read = {
      id: "read-1",
      kind: "read" as const,
      status: "parked" as const,
      url: "https://example.com/article",
      title: "On interface craft",
      summary: "Argues small details compound.",
      effortTier: "focused_session" as const,
      suggestedTestTask: "Pick one detail to apply.",
      usefulnessHypothesis: "May sharpen the next visual pass.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      lastActivityAt: "2026-07-30T00:00:00.000Z",
    };

    render(
      <ItemInspector
        item={read}
        open
        onOpenChange={vi.fn()}
        onApplyAction={vi.fn()}
        onUpdateEvidence={vi.fn()}
        onUpdateIdea={vi.fn()}
        onRepark={vi.fn()}
      />,
    );

    expect(screen.getByText("Read ticket · Parked")).toBeVisible();
    expect(screen.getByText("What it appears to argue")).toBeVisible();
    expect(screen.getByText("Question this should answer")).toBeVisible();
    expect(screen.getByText("Why it may be worth the time")).toBeVisible();
    expect(screen.getByText("Careful read")).toBeVisible();
    expect(screen.getByText("Open original read")).toBeVisible();
  });

  it("uses read-specific wording in the Tow Away confirmation for a read item", async () => {
    const user = userEvent.setup();
    const read: ParkingItem = {
      id: "read-2",
      kind: "read",
      status: "parked",
      url: "https://example.com/article",
      title: "On interface craft",
      summary: "Argues small details compound.",
      effortTier: "focused_session",
      suggestedTestTask: "Pick one detail to apply.",
      usefulnessHypothesis: "May sharpen the next visual pass.",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z",
      lastActivityAt: "2026-07-30T00:00:00.000Z",
    };

    renderInspector(read);

    await user.click(screen.getByRole("button", { name: "Tow Away" }));

    const placeholder = screen.getByLabelText("Decision reason").getAttribute("placeholder");
    expect(placeholder).toContain("read");
    expect(placeholder).not.toContain("tool");
  });
});

/*
 * Re-park lives here with the other item actions, driven entirely by the
 * item's own stored classification. There is no separate advisory object to
 * keep in step with the item, and the inspector is a modal — only one item's
 * re-park can exist at a time.
 */
describe("ItemInspector re-park", () => {
  const analysis = {
    title: "On interface craft",
    summary: "Argues small details compound.",
    effortTier: "focused_session",
    suggestedTestTask: "Pick one detail to apply.",
    usefulnessHypothesis: "May sharpen the next visual pass.",
  };

  const misparkedTool: ParkingItem = {
    id: "tool-1",
    kind: "ai_tool",
    status: "parked",
    url: "https://example.com/article",
    title: "On interface craft",
    summary: "Argues small details compound.",
    effortTier: "focused_session",
    suggestedTestTask: "Pick one detail to apply.",
    usefulnessHypothesis: "May sharpen the next visual pass.",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
    lastActivityAt: "2026-07-30T00:00:00.000Z",
    suggestedKind: "read",
    kindRationale: "Long-form prose.",
  };

  function respond(suggestedKind: string, warning?: string) {
    return vi.fn((_input?: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        Response.json({
          analysis,
          sourceMode: warning ? "url_only" : "fetched",
          ...(warning ? { warning } : {}),
          classification: { suggestedKind, rationale: "Long-form prose." },
        }),
      ),
    );
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the stored rationale and a pressable re-park button naming the suggested kind", () => {
    renderInspector(misparkedTool);

    expect(screen.getByText("Long-form prose.")).toBeVisible();
    const button = screen.getByRole("button", { name: "Re-park as Read" });
    expect(button).toBeVisible();
    expect(button).toHaveClass("pressable");
  });

  it("offers no re-park when the stored classification agrees", () => {
    renderInspector({ ...misparkedTool, suggestedKind: "ai_tool" as const });

    expect(screen.queryByRole("button", { name: /^Re-park as/ })).not.toBeInTheDocument();
  });

  it("offers no re-park when the item was never classified", () => {
    renderInspector({
      ...misparkedTool,
      suggestedKind: undefined,
      kindRationale: undefined,
    });

    expect(screen.queryByRole("button", { name: /^Re-park as/ })).not.toBeInTheDocument();
  });

  // Follows the same terminal suppression as every other item action, so a
  // suggestion can never outlive its item's final decision.
  it.each(["garaged", "scrapped"] as const)(
    "offers no re-park for %s items, alongside the other suppressed actions",
    (status) => {
      renderInspector({ ...misparkedTool, status, testStartedAt: "2026-07-30T00:00:00.000Z" });

      expect(screen.queryByRole("button", { name: /^Re-park as/ })).not.toBeInTheDocument();
    },
  );

  it("re-analyses under the suggested kind and hands the store both analysis and classification", async () => {
    const user = userEvent.setup();
    const fetchMock = respond("read");
    vi.stubGlobal("fetch", fetchMock);
    const { onRepark } = renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    await waitFor(() => expect(onRepark).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]!.body))).toEqual({
      url: "https://example.com/article",
      kind: "read",
    });
    expect(onRepark).toHaveBeenCalledWith("read", analysis, {
      suggestedKind: "read",
      rationale: "Long-form prose.",
    });
  });

  // The re-park response's own URL-only warning must be visible even though
  // an agreeing response removes the section that triggered it — the warning
  // is owned by the inspector, which stays mounted, not by that section.
  it("shows this re-park's URL-only warning", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      respond("read", "Page text could not be fetched, so this analysis uses the URL only."),
    );
    renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(
      await screen.findByText(
        "Page text could not be fetched, so this analysis uses the URL only.",
      ),
    ).toBeVisible();
  });

  it("does not carry a previous re-park's warning into a later cleanly-fetched one", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            analysis,
            sourceMode: "url_only",
            warning: "Page text could not be fetched, so this analysis uses the URL only.",
            classification: { suggestedKind: "read", rationale: "Long-form prose." },
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            analysis,
            sourceMode: "fetched",
            classification: { suggestedKind: "read", rationale: "Long-form prose." },
          }),
        ),
    );
    renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));
    expect(await screen.findByText(/uses the URL only/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    await waitFor(() =>
      expect(screen.queryByText(/uses the URL only/)).not.toBeInTheDocument(),
    );
  });

  it("surfaces the 429 retry wording and keeps the button available for a retry", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: "Too many requests." },
            { status: 429, headers: { "retry-after": "5" } },
          ),
        ),
      ),
    );
    renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 5 seconds.",
    );
    expect(screen.getByRole("button", { name: "Re-park as Read" })).toBeVisible();
  });

  it("applies the 503 wording to a re-park failure, same as analyze", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json({ error: "Live AI is temporarily unavailable." }, { status: 503 }),
        ),
      ),
    );
    renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Live AI is temporarily unavailable. Try again shortly.",
    );
  });

  // A successful HTTP round trip whose store write is refused must be
  // surfaced, not silently ignored.
  it("surfaces a store refusal that follows a successful fetch", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read"));
    renderInspector(
      misparkedTool,
      undefined,
      undefined,
      vi.fn().mockReturnValue({
        ok: false,
        reason: "terminal",
        message: "This item has reached a final decision and cannot be edited.",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This item has reached a final decision and cannot be edited.",
    );
  });

  it("rejects a re-park response that cannot be verified", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(Response.json({ analysis, sourceMode: "fetched" }))),
    );
    const { onRepark } = renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The re-park response could not be verified.",
    );
    expect(onRepark).not.toHaveBeenCalled();
  });

  // One user can still double-click, so the guard must be a synchronous lock
  // rather than a render snapshot.
  it("does not let two re-park clicks in the same commit both start a request", async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    renderInspector(misparkedTool);

    const button = screen.getByRole("button", { name: "Re-park as Read" });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Closing the inspector aborts the request; a response that still wins the
  // race past the network call must not write to the store afterwards.
  it("does not call onRepark after unmount even if the response arrives late", async () => {
    const user = userEvent.setup();
    let resolveRepark!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_input?: RequestInfo | URL, _init?: RequestInit) =>
          new Promise<Response>((resolve) => {
            resolveRepark = resolve;
          }),
      ),
    );
    const { onRepark, unmount } = renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));
    unmount();
    await act(async () => {
      resolveRepark(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "read", rationale: "Long-form prose." },
        }),
      );
    });

    expect(onRepark).not.toHaveBeenCalled();
  });

  it("sends an abort signal with the re-park request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(
      (_input?: RequestInfo | URL, _init?: RequestInit) => new Promise(() => {}),
    );
    vi.stubGlobal("fetch", fetchMock);
    renderInspector(misparkedTool);

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(fetchMock.mock.calls[0]?.[1]).toHaveProperty("signal");
  });
});
