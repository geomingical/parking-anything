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

describe("LinkCaptureForm mis-park advisory", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("advises when the model suggests a different kind", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read"));
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByText(/Long-form prose\./)).toBeVisible();
    expect(screen.getByRole("button", { name: "Re-park as Read" })).toBeVisible();
  });

  it("stays silent when the model agrees", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("ai_tool"));
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Re-park as/ })).not.toBeInTheDocument(),
    );
  });

  it("shows a fetch warning and the advisory in separate slots", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", respond("read", "Page text could not be fetched, so this analysis uses the URL only."));
    render(
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    expect(await screen.findByText(/uses the URL only/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Re-park as Read" })).toBeVisible();
  });

  it("re-analyses under the suggested kind and clears the advisory", async () => {
    const user = userEvent.setup();
    const fetchMock = respond("read");
    vi.stubGlobal("fetch", fetchMock);
    const onRepark = vi.fn((_id: string, _kind: string, _analysis: unknown) => ({ ok: true as const }));
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={onRepark} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    await waitFor(() => expect(onRepark).toHaveBeenCalledTimes(1));
    expect(onRepark.mock.calls[0][0]).toBe("parked-id");
    expect(onRepark.mock.calls[0][1]).toBe("read");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]!.body)).kind).toBe("read");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^Re-park as/ })).not.toBeInTheDocument(),
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
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
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
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
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
      <LinkCaptureForm
        kind="ai_tool"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
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
      <LinkCaptureForm
        kind="read"
        onPark={() => ({ ok: true })}
        onRepark={() => ({ ok: true })}
      />,
    );

    expect(screen.getByLabelText("Read URL")).toHaveAttribute(
      "placeholder",
      "https://example.com/article",
    );
  });
});

describe("LinkCaptureForm fix round 1: repark hardening", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const classification = { suggestedKind: "read", rationale: "Long-form prose." };

  // Finding 1: re-park has no AbortController and no ownership check, so a
  // response that arrives after unmount still mutates the store with no UI
  // left to report it. The mock ignores the abort signal entirely (resolves
  // anyway) to prove the fix does not rely on the network layer honouring
  // abort() — the ownership check must catch it independently.
  // This also exercises the "ALSO" note: the ownership check must be
  // genuinely reachable, not dead code.
  it("does not call onRepark after unmount even if the in-flight re-park response arrives late", async () => {
    const user = userEvent.setup();
    let resolveRepark!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      )
      .mockImplementationOnce(
        () => new Promise<Response>((resolve) => { resolveRepark = resolve; }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onRepark = vi.fn(() => ({ ok: true as const }));
    const { unmount } = render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={onRepark} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(fetchMock.mock.calls[1]?.[1]).toHaveProperty("signal");

    unmount();
    await act(async () => {
      resolveRepark(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    });

    expect(onRepark).not.toHaveBeenCalled();
  });

  // Companion coverage for the "ALSO" note: the same dead-ownership-check
  // problem exists on the original park path (:111). Prove it is reachable
  // there too.
  it("does not call onPark after unmount even if the in-flight analyze response arrives late", async () => {
    const user = userEvent.setup();
    let resolveAnalyze!: (response: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => { resolveAnalyze = resolve; }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onPark = vi.fn(() => ({ ok: true as const }));
    const { unmount } = render(
      <LinkCaptureForm kind="ai_tool" onPark={onPark} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));

    unmount();
    await act(async () => {
      resolveAnalyze(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      );
    });

    expect(onPark).not.toHaveBeenCalled();
  });

  // Finding 2: park and re-park must share one lock. The URL input and
  // submit button must be disabled whenever EITHER is active.
  it("disables the URL input and submit while a re-park is in flight", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      )
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(screen.getByLabelText("AI tool URL")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Analyze & Park" })).toBeDisabled();
  });

  // Finding 2 (continued): even if the disabled submit button is bypassed
  // (e.g. Enter-key submit dispatched directly on the form), the function's
  // own lock must refuse to start a park while a re-park owns it — a new
  // park must never clobber an in-flight re-park or vice versa.
  it("refuses to start a park while a re-park is in flight even if the disabled submit is bypassed", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      )
      .mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    const input = screen.getByLabelText("AI tool URL");
    await user.type(input, "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The first park clears the URL field on success; force a fresh value in
    // directly (bypassing the disabled attribute, same as the double-submit
    // test above) so this exercises the lock itself, not the empty-URL
    // early-return.
    fireEvent.change(input, { target: { value: "https://example.com/b" } });
    fireEvent.submit(input.closest("form")!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Finding 3: re-park's own re-entry guard was a render-snapshot state read
  // (`if (reparking) return`), exactly the anti-pattern Defect B removed
  // from the park path. Two clicks dispatched in the same commit must still
  // only start one second request.
  it("does not let two re-park clicks in the same commit both start a request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      )
      .mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    const reparkButton = await screen.findByRole("button", { name: "Re-park as Read" });

    await act(async () => {
      fireEvent.click(reparkButton);
      fireEvent.click(reparkButton);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Finding 4: the re-park must own its own warning slot instead of leaving
  // a stale warning from the first analysis, or hiding a new one that now
  // applies. Cover both orderings.
  it("clears a stale url-only warning once the re-park is fully fetched", async () => {
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
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(await screen.findByText(/uses the URL only/)).toBeVisible();

    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    await waitFor(() =>
      expect(screen.queryByText(/uses the URL only/)).not.toBeInTheDocument(),
    );
  });

  it("shows a new warning from the re-park even when the first analysis had none", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification }),
      )
      .mockResolvedValueOnce(
        Response.json({
          analysis,
          sourceMode: "url_only",
          warning: "Page text could not be fetched, so this analysis uses the URL only.",
          classification,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    expect(screen.queryByText(/uses the URL only/)).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByText(/uses the URL only/)).toBeVisible();
  });
});

describe("LinkCaptureForm final fix wave", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { ...globalThis.crypto, randomUUID: () => "parked-id" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Finding 1: a transient re-park failure (quota gate 429, a needsReset store
  // refusal, etc.) must NOT clear the advisory. The advisory's button is the
  // only affordance that can change an item's kind, so clearing it here
  // strands the item under the wrong kind forever.
  it("keeps the advisory and its re-park button after a 429 re-park failure", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification: { suggestedKind: "read", rationale: "Long-form prose." } }),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: "Too many requests." },
          { status: 429, headers: { "retry-after": "5" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many requests. Try again in 5 seconds.",
    );
    expect(screen.getByRole("button", { name: "Re-park as Read" })).toBeVisible();
  });

  // Finding 2: repark must apply the same 503 "try again shortly" wording as
  // analyzeAndPark, not a bare server string.
  it("applies the 503 wording to a re-park failure, same as analyze", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ analysis, sourceMode: "fetched", classification: { suggestedKind: "read", rationale: "Long-form prose." } }),
      )
      .mockResolvedValueOnce(
        Response.json({ error: "Live AI is temporarily unavailable." }, { status: 503 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    render(
      <LinkCaptureForm kind="ai_tool" onPark={() => ({ ok: true })} onRepark={() => ({ ok: true })} />,
    );

    await user.type(screen.getByLabelText("AI tool URL"), "https://example.com/a");
    await user.click(screen.getByRole("button", { name: "Analyze & Park" }));
    await user.click(await screen.findByRole("button", { name: "Re-park as Read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Live AI is temporarily unavailable. Try again shortly.",
    );
  });
});
