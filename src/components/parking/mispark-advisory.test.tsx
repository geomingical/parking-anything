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
        onDismiss={() => {}}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/Long-form prose\./);
    const button = screen.getByRole("button", { name: "Re-park example.com as Read" });
    expect(button).toBeVisible();
    expect(button).toHaveClass("pressable");
  });

  // Finding 2: two advisories with similar rationales are otherwise
  // indistinguishable, and the button's accessible name used to be identical
  // for both. PendingAdvisory carries no title in this fixture, so the card
  // must fall back to the URL's hostname.
  it("shows the URL hostname as identity on the card when no title is available", () => {
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
        onDismiss={() => {}}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("example.com");
    expect(
      screen.getByRole("button", { name: "Re-park example.com as Read" }),
    ).toBeVisible();
  });

  // Finding 2: the item's stored title, when available, must be preferred
  // over the URL hostname for identity.
  it("prefers the item's stored title over the URL hostname for identity", () => {
    render(
      <MisparkAdvisory
        advisory={{ ...pendingAdvisory, title: "On interface craft" }}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
        onDismiss={() => {}}
      />,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("On interface craft");
    expect(
      screen.getByRole("button", { name: "Re-park On interface craft as Read" }),
    ).toBeVisible();
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
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));

    await waitFor(() => expect(onRepark).toHaveBeenCalledTimes(1));
    expect(onRepark).toHaveBeenCalledWith("parked-id", "read", analysis);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]!.body)).kind).toBe("read");
    // Finding 3: the warning now travels alongside the advisory instead of
    // being rendered (and lost on unmount) inside this component.
    await waitFor(() => expect(onReparked).toHaveBeenCalledWith(null, null));
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
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));

    await waitFor(() =>
      expect(onReparked).toHaveBeenCalledWith(
        {
          ...pendingAdvisory,
          suggestedKind: "ai_tool",
          rationale: "Long-form prose.",
        },
        null,
      ),
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
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));
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
        onDismiss={() => {}}
      />,
    );

    const button = screen.getByRole("button", { name: "Re-park example.com as Read" });
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Finding 3: this used to render the warning locally and prove it cleared
  // on a subsequent fetch by keeping the OLD advisory around whenever
  // onReparked received `null` (`advisory = next ?? advisory`) — which is
  // NOT what the real handler (ParkingApp) does. ParkingApp drops the
  // advisory outright on `null`, unmounting this component, so a warning
  // that lived in this component's own state would never have painted in
  // production. The component no longer holds any warning state at all: it
  // hands (next, warning) up on every call, and it is the CALLER's job (now
  // tested end-to-end in parking-app.test.tsx) to show a fresh warning and
  // not carry a stale one forward. What this component still owns, and what
  // this test verifies mirroring the real handler, is that each call reports
  // exactly the warning that came back with THAT response — never one
  // left over from a previous call.
  it("reports a fresh warning (or null) with every onReparked call, mirroring the real (non-retaining) handler", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "url_only",
          warning: "Page text could not be fetched, so this analysis uses the URL only.",
          classification: { suggestedKind: "ai_tool", rationale: "Long-form prose." },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "fetched",
          // Agrees with the SECOND click's advisory kind ("ai_tool"), so
          // this is the agreement (null) case.
          classification: { suggestedKind: "ai_tool", rationale: "Long-form prose." },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onReparked = vi.fn();
    const { rerender } = render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={onReparked}
        onReparkFailed={() => {}}
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));
    await waitFor(() =>
      expect(onReparked).toHaveBeenNthCalledWith(
        1,
        { ...pendingAdvisory, suggestedKind: "ai_tool", rationale: "Long-form prose." },
        "Page text could not be fetched, so this analysis uses the URL only.",
      ),
    );

    // The real handler passes back exactly the advisory it was handed in the
    // previous call — never the stale one it started with.
    rerender(
      <MisparkAdvisory
        advisory={{ ...pendingAdvisory, suggestedKind: "ai_tool", rationale: "Long-form prose." }}
        onRepark={() => ({ ok: true })}
        onReparked={onReparked}
        onReparkFailed={() => {}}
        onDismiss={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Re-park example.com as Tool" }));

    await waitFor(() => expect(onReparked).toHaveBeenNthCalledWith(2, null, null));
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
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 5 seconds.",
    );
    expect(screen.getByRole("button", { name: "Re-park example.com as Read" })).toBeVisible();
    // A network/HTTP-layer failure carries no store-decided reason — always
    // transient from this component's point of view.
    expect(onReparkFailed).toHaveBeenCalledWith(
      pendingAdvisory,
      undefined,
      "Too many requests. Try again in 5 seconds.",
    );
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
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));

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
        onRepark={() => ({
          ok: false,
          reason: "terminal",
          message: "This item has reached a final decision and cannot be edited.",
        })}
        onReparked={() => {}}
        onReparkFailed={onReparkFailed}
        onDismiss={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Re-park example.com as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This item has reached a final decision and cannot be edited.",
    );
    // The store-decided reason travels with the failure so the caller never
    // has to re-derive permanence from its own (possibly stale) item list.
    expect(onReparkFailed).toHaveBeenCalledWith(
      pendingAdvisory,
      "terminal",
      "This item has reached a final decision and cannot be edited.",
    );
  });
});

// Finding 3: an advisory used to outlive its item's lifecycle, only ever
// removed by a re-park result or a full reset — leaving a user with no way
// to clear one they simply don't want. This control gives every card an
// explicit, always-available way out, named for the same reason the re-park
// button is (Finding 2): a screen-reader user with two advisories on screen
// must be able to tell which one they are about to dismiss.
describe("MisparkAdvisory dismiss control", () => {
  it("renders a dismiss control naming the item, using the pressable class", () => {
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
        onDismiss={() => {}}
      />,
    );

    const dismiss = screen.getByRole("button", { name: "Dismiss example.com advisory" });
    expect(dismiss).toBeVisible();
    expect(dismiss).toHaveClass("pressable");
  });

  it("calls onDismiss with the item id when the dismiss control is activated", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <MisparkAdvisory
        advisory={pendingAdvisory}
        onRepark={() => ({ ok: true })}
        onReparked={() => {}}
        onReparkFailed={() => {}}
        onDismiss={onDismiss}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Dismiss example.com advisory" }));

    expect(onDismiss).toHaveBeenCalledWith("parked-id");
  });
});
