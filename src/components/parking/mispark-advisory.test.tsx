import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MisparkAdvisory, type PendingAdvisory } from "./mispark-advisory";

const analysis = {
  title: "On interface craft",
  summary: "Argues small details compound.",
  effortTier: "focused_session",
  suggestedTestTask: "Pick one detail to apply.",
  usefulnessHypothesis: "May sharpen the next visual pass.",
};

const classification = { suggestedKind: "read", rationale: "Long-form prose." };

const pendingAdvisory: PendingAdvisory = {
  itemId: "parked-id",
  url: "https://example.com/a",
  suggestedKind: "read",
  rationale: "Long-form prose.",
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

describe("MisparkAdvisory rendering", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the rationale and a re-park button using the pressable class, inside role=status", () => {
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/Long-form prose\./);
    const button = screen.getByRole("button", { name: "Re-park as Read" });
    expect(button).toBeVisible();
    expect(button).toHaveClass("pressable");
  });
});

describe("MisparkAdvisory re-park flow", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("re-analyses under the suggested kind and reports agreement via onReparked(null)", async () => {
    const user = userEvent.setup();
    const fetchMock = respond("read");
    vi.stubGlobal("fetch", fetchMock);
    const onRepark = vi.fn(() => ({ ok: true as const }));
    const onReparked = vi.fn();
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={onRepark}
        onReparked={onReparked}
        onReparkFailed={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    await waitFor(() => expect(onRepark).toHaveBeenCalledTimes(1));
    expect(onRepark).toHaveBeenCalledWith("parked-id", "read", analysis);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]!.body)).kind).toBe("read");
    await waitFor(() => expect(onReparked).toHaveBeenCalledWith(null));
  });

  it("reports a new advisory via onReparked when the re-park still disagrees", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("ai_tool"));
    const onReparked = vi.fn();
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={onReparked}
        onReparkFailed={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    await waitFor(() =>
      expect(onReparked).toHaveBeenCalledWith({
        ...pendingAdvisory,
        suggestedKind: "ai_tool",
        rationale: "Long-form prose.",
      }),
    );
  });

  // Mirrors the abort/ownership hardening previously proven for repark inside
  // LinkCaptureForm: a response that arrives after unmount must not call
  // onRepark or onReparked on a dead instance.
  it("does not call onRepark after unmount even if the in-flight re-park response arrives late", async () => {
    const user = userEvent.setup();
    let resolveRepark!: (response: Response) => void;
    const fetchMock = vi.fn(
      (_input?: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>((resolve) => { resolveRepark = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onRepark = vi.fn(() => ({ ok: true as const }));
    const { unmount } = render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={onRepark}
        onReparked={() => {}}
        onReparkFailed={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));
    expect(fetchMock.mock.calls[0]?.[1]).toHaveProperty("signal");

    unmount();
    await act(async () => {
      resolveRepark(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    });

    expect(onRepark).not.toHaveBeenCalled();
  });

  it("does not let two re-park clicks in the same commit both start a request", async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Re-park as Read" });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears a stale url-only warning once a subsequent re-park is fully fetched", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "url_only",
          warning: "Page text could not be fetched, so this analysis uses the URL only.",
          classification,
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    vi.stubGlobal("fetch", fetchMock);
    let advisory = pendingAdvisory;
    const { rerender } = render(
      <MisparkAdvisory
        advisory={advisory}
        onRepark={() => ({ ok: true })}
        onReparked={(next) => {
          advisory = next ?? advisory;
        }}
        onReparkFailed={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));
    expect(await screen.findByText(/uses the URL only/)).toBeVisible();

    rerender(
      <MisparkAdvisory
        advisory={advisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    await waitFor(() =>
      expect(screen.queryByText(/uses the URL only/)).not.toBeInTheDocument(),
    );
  });
});

describe("MisparkAdvisory failure handling", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // The component itself never unmounts on failure — that decision belongs
  // to the parent (ParkingApp), which decides keep-vs-drop by consulting
  // store.items. This proves the component's own contribution: it surfaces
  // the failure message and keeps its button available for a retry unless
  // the parent stops rendering it.
  it("shows the 429 retry wording and keeps its own button after a failed re-park", async () => {
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
    const onReparkFailed = vi.fn();
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={onReparkFailed}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 5 seconds.",
    );
    expect(screen.getByRole("button", { name: "Re-park as Read" })).toBeVisible();
    expect(onReparkFailed).toHaveBeenCalledWith(pendingAdvisory);
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
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Live AI is temporarily unavailable. Try again shortly.",
    );
  });

  // A successful HTTP round trip whose store write is refused (e.g. the
  // target item became terminal in the meantime) must be treated the same
  // as a network failure: reported via onReparkFailed, not silently ignored.
  it("calls onReparkFailed when the store refuses the re-park after a successful fetch", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read"));
    const onReparkFailed = vi.fn();
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: false, message: "This item has reached a final decision and cannot be edited." })}
        onReparked={() => {}}
        onReparkFailed={onReparkFailed}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This item has reached a final decision and cannot be edited.",
    );
    expect(onReparkFailed).toHaveBeenCalledWith(pendingAdvisory);
  });
});
