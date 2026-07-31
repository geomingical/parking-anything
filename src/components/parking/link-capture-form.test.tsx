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
