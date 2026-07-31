/**
 * Reads a fetch Response body as JSON without ever throwing. An error
 * response (502/503, a proxy's HTML page, an empty body) must surface the
 * generic message below, not a raw JSON parse error.
 */
export async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractServerError(body: unknown): string | null {
  if (typeof body === "object" && body !== null && "error" in body) {
    const { error } = body as { error: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

/**
 * analyzeAndPark (link-capture-form.tsx) and repark (mispark-advisory.tsx)
 * hit the same /api/analyze-url endpoint and must present the same guidance
 * for the same failure — retry-after wording for a 429 quota rejection, "try
 * again shortly" for a 503 outage. Both callers route through this one
 * helper so the wording can never drift between them.
 */
export function messageForFailedResponse(
  response: Response,
  body: unknown,
  fallbackMessage: string,
): string {
  const serverError = extractServerError(body) ?? fallbackMessage;
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `${serverError} Try again in ${retryAfter} seconds.`
      : `${serverError} Try again shortly.`;
  }
  if (response.status === 503) return `${serverError} Try again shortly.`;
  return serverError;
}
