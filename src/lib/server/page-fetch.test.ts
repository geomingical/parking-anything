import { afterEach, describe, expect, it, vi } from "vitest";

import type { DnsResolver } from "./url-safety";
import {
  PublicFetchError,
  fetchPublicPage,
  type FetchImplementation,
} from "./page-fetch";

const publicResolver: DnsResolver = vi.fn(async () => [
  { address: "93.184.216.34", family: 4 },
]);

function fetchSequence(...responses: Response[]): FetchImplementation {
  return vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected fetch call");
    return response;
  });
}

describe("fetchPublicPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("follows relative redirects manually and returns the final normalized URL", async () => {
    const fetchImpl = fetchSequence(
      new Response(null, { status: 302, headers: { location: "/docs" } }),
      new Response("<h1>Public docs</h1>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
    );

    await expect(
      fetchPublicPage("https://example.com/start", { fetchImpl, resolver: publicResolver }),
    ).resolves.toEqual({
      normalizedUrl: "https://example.com/docs",
      text: "Public docs",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://example.com/start",
      expect.objectContaining({ redirect: "manual" }),
    );
  });

  it("revalidates and rejects a redirect to a private target", async () => {
    const fetchImpl = fetchSequence(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    );

    await expect(
      fetchPublicPage("https://example.com/start", { fetchImpl, resolver: publicResolver }),
    ).rejects.toThrow("URL resolves to a non-public address.");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects more than three redirects", async () => {
    const fetchImpl = fetchSequence(
      ...[1, 2, 3, 4].map(
        (step) =>
          new Response(null, {
            status: 302,
            headers: { location: `/step-${step}` },
          }),
      ),
    );

    await expect(
      fetchPublicPage("https://example.com/start", { fetchImpl, resolver: publicResolver }),
    ).rejects.toEqual(expect.any(PublicFetchError));
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("rejects a declared response larger than one megabyte", async () => {
    const fetchImpl = fetchSequence(
      new Response("small", {
        headers: {
          "content-type": "text/plain",
          "content-length": String(1_048_577),
        },
      }),
    );

    await expect(
      fetchPublicPage("https://example.com/large", { fetchImpl, resolver: publicResolver }),
    ).rejects.toThrow("The public page is larger than 1 MB.");
  });

  it("rejects a streamed response larger than one megabyte", async () => {
    const fetchImpl = fetchSequence(
      new Response(new Uint8Array(1_048_577), {
        headers: { "content-type": "text/plain" },
      }),
    );

    await expect(
      fetchPublicPage("https://example.com/large", { fetchImpl, resolver: publicResolver }),
    ).rejects.toThrow("The public page is larger than 1 MB.");
  });

  it("rejects unsupported response content", async () => {
    const fetchImpl = fetchSequence(
      new Response('{"private":"data"}', {
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(
      fetchPublicPage("https://example.com/data", { fetchImpl, resolver: publicResolver }),
    ).rejects.toThrow("The public URL did not return readable page text.");
  });

  it("aborts the whole operation after five seconds", async () => {
    vi.useFakeTimers();
    const fetchImpl: FetchImplementation = vi.fn(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const pending = fetchPublicPage("https://example.com/slow", {
      fetchImpl,
      resolver: publicResolver,
    });
    const expectation = expect(pending).rejects.toThrow("The public page fetch timed out.");
    await vi.advanceTimersByTimeAsync(5_000);
    await expectation;
  });

  it("extracts safe text and decodes common HTML entities", async () => {
    const fetchImpl = fetchSequence(
      new Response(
        `<!doctype html><style>.hidden{display:none}</style><script>steal()</script>
         <noscript>fallback noise</noscript><main><h1>Tool &amp; Demo</h1>
         <p>Try&nbsp;one &lt;sample&gt; &quot;today&quot;.</p></main>`,
        { headers: { "content-type": "text/html" } },
      ),
    );

    await expect(
      fetchPublicPage("https://example.com/tool", { fetchImpl, resolver: publicResolver }),
    ).resolves.toMatchObject({
      text: 'Tool & Demo Try one <sample> "today".',
    });
  });

  it("truncates extracted text to 12,000 characters", async () => {
    const fetchImpl = fetchSequence(
      new Response(`<main>${"x".repeat(12_500)}</main>`, {
        headers: { "content-type": "text/html" },
      }),
    );

    const result = await fetchPublicPage("https://example.com/long", {
      fetchImpl,
      resolver: publicResolver,
    });

    expect(result.text).toHaveLength(12_000);
  });
});
