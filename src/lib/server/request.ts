export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function readBoundedJson(
  request: Request,
  maxBytes = 8_192,
): Promise<unknown> {
  const declaredHeader = request.headers.get("content-length");
  const declaredBytes = declaredHeader === null ? 0 : Number(declaredHeader);

  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new HttpError(413, "Request body is too large.");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "Request body is too large.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function errorResponse(error: unknown): Response {
  const known =
    error instanceof HttpError
      ? error
      : new HttpError(500, "Unexpected server error.");
  const headers = known.retryAfter
    ? { "Retry-After": String(known.retryAfter) }
    : undefined;

  return Response.json(
    { error: known.message },
    { status: known.status, headers },
  );
}
