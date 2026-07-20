import { describe, expect, it } from "vitest";

import { HttpError, errorResponse, readBoundedJson } from "./request";

describe("readBoundedJson", () => {
  it("parses valid JSON below the default 8 KB limit", async () => {
    const request = new Request("https://parking.test/api", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });

    await expect(readBoundedJson(request)).resolves.toEqual({
      url: "https://example.com",
    });
  });

  it("rejects a declared content length above the limit without reading the body", async () => {
    const request = new Request("https://parking.test/api", {
      method: "POST",
      headers: { "content-length": "8193" },
      body: "private request content",
    });

    await expect(readBoundedJson(request)).rejects.toMatchObject({
      status: 413,
      message: "Request body is too large.",
    });
    expect(request.bodyUsed).toBe(false);
  });

  it.each([
    ["without a content-length header", undefined],
    ["with an incorrect content-length header", "10"],
  ])("rejects an actual UTF-8 body above the limit %s", async (_label, contentLength) => {
    const body = JSON.stringify({ value: "停".repeat(2_800) });
    const headers = contentLength ? { "content-length": contentLength } : undefined;
    const request = new Request("https://parking.test/api", {
      method: "POST",
      headers,
      body,
    });

    await expect(readBoundedJson(request)).rejects.toMatchObject({
      status: 413,
      message: "Request body is too large.",
    });
  });

  it("returns a typed 400 error for malformed JSON without echoing its content", async () => {
    const secretBody = '{"apiKey":"never-echo-this"';
    const request = new Request("https://parking.test/api", {
      method: "POST",
      body: secretBody,
    });

    const error = await readBoundedJson(request).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 400,
      message: "Request body must be valid JSON.",
    });
    expect(String(error)).not.toContain(secretBody);
  });
});

describe("errorResponse", () => {
  it("serializes known errors and includes bounded retry guidance", async () => {
    const response = errorResponse(new HttpError(429, "Demo request limit reached.", 42));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      error: "Demo request limit reached.",
    });
  });

  it("uses a fixed response for unknown errors without exposing their content", async () => {
    const response = errorResponse(new Error("database password must remain private"));

    expect(response.status).toBe(500);
    expect(response.headers.get("retry-after")).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: "Unexpected server error." });
  });
});
