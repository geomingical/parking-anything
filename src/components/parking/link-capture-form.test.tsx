import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LinkCaptureForm } from "./link-capture-form";

const analysis = {
  title: "On interface craft",
  summary: "Argues small details compound.",
  effortTier: "focused_session",
  suggestedTestTask: "Pick one detail to apply.",
  usefulnessHypothesis: "May sharpen the next visual pass.",
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

// Residual fix (P1): LinkCaptureForm no longer owns any mis-park advisory
// state or re-park logic itself (that moved to ParkingApp + MisparkAdvisory,
// see parking-app.tsx and mispark-advisory.tsx) — otherwise switching capture
// mode remounts this keyed form and silently destroys the only affordance
// that can change an item's kind. This form's job is now just to REPORT a
// mismatch upward via onMispark after a successful park.
describe("LinkCaptureForm onMispark reporting", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calls onMispark with the classification when the model suggests a different kind", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read"));
    const onMispark = vi.fn();
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onMispark={onMispark}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    await waitFor(() =>
      expect(onMispark).toHaveBeenCalledWith({
        itemId: "parked-id",
        url: "https://example.com/a",
        suggestedKind: "read",
        rationale: "Long-form prose.",
      }),
    );
  });

  it("does not call onMispark when the model agrees", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("ai_tool"));
    const onMispark = vi.fn();
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onMispark={onMispark}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    await screen.findByRole("button", { name: "Analyze & Park" });
    expect(onMispark).not.toHaveBeenCalled();
  });

  it("shows a fetch warning while still calling onMispark for the advisory (separate concerns)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read", "Page text could not be fetched, so this analysis uses the URL only."));
    const onMispark = vi.fn();
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onMispark={onMispark}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByText(/uses the URL only/)).toBeVisible();
    expect(onMispark).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedKind: "read" }),
    );
  });
});

describe("LinkCaptureForm defect fixes", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Defect B: the duplicate-submit guard must be a synchronous lock, not a
  // render snapshot. Two submits dispatched within the same React commit
  // (before any re-render can flush) must still only start one request.
  it("does not let two submits in the same commit both start a request", async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} />,
    );

    const input = screen.getByLabelText("AI tool URL");
    fireEvent.change(input, { target: { value: "https://example.com/a" } });
    const form = input.closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Defect C: response.json() must not be awaited blindly before response.ok
  // is checked. An HTML/empty 502 body must surface the generic message, not
  // a raw JSON parse error.
  it("shows the generic error message when an error response has an unreadable body", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(new Response("<html>Bad Gateway</html>", { status: 502 })),
      ),
    );
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The analysis could not be completed.",
    );
  });

  // Defect C (continued): the existing 429/503 wording must be preserved
  // exactly when the body IS readable JSON.
  it("still applies the 429 retry-after wording when the body is valid JSON", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { error: "Too many requests." },
            { status: 429, headers: { "retry-after": "12" } },
          ),
        ),
      ),
    );
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 12 seconds.",
    );
  });

  // Defect E: the URL placeholder must come from the link-kind registry
  // instead of being hardcoded to the tool example for every kind.
  it("shows the read placeholder for the read kind", () => {
    render(
      <LinkCaptureForm kind="read" onPark={() => ({ ok: true })} />,
    );

    expect(screen.getByLabelText("Read URL")).toHaveAttribute(
      "placeholder",
      "https://example.com/article",
    );
  });
});

describe("LinkCaptureForm fix round 1: analyze/park hardening", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Finding 1: an in-flight analyze response that resolves after unmount
  // must not call onPark on a dead instance. The ownership check is gated on
  // the AbortController ref, which unmount cleanup nulls out — genuinely
  // reachable, not dead code.
  it("does not call onPark after unmount even if the in-flight analyze response arrives late", async () => {
    const user = userEvent.setup();
    let resolveAnalyze!: (response: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => { resolveAnalyze = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onPark = vi.fn(() => ({ ok: true as const }));
    const { unmount } = render(
      <LinkCaptureForm kind="ai_tool" onPark={onPark} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    unmount();
    await act(async () => {
      resolveAnalyze(
        Response.json({
          analysis,
          sourceMode: "fetched",
          classification: { suggestedKind: "ai_tool", rationale: "Long-form prose." },
        }),
      );
    });

    expect(onPark).not.toHaveBeenCalled();
  });
});
