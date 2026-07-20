import type { DnsResolver } from "./url-safety";
import { validatePublicUrl } from "./url-safety";

const MAX_RESPONSE_BYTES = 1_048_576;
const MAX_EXTRACTED_CHARACTERS = 12_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5_000;
const ACCEPTED_CONTENT_TYPES = new Set([
  "text/html",
  "text/plain",
  "application/xhtml+xml",
]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type FetchPublicPageDependencies = {
  fetchImpl?: FetchImplementation;
  resolver?: DnsResolver;
  timeoutMs?: number;
};

export class PublicFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicFetchError";
  }
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,
    (match, entity: string) => {
      const normalized = entity.toLowerCase();
      if (normalized.startsWith("#x")) {
        const codePoint = Number.parseInt(normalized.slice(2), 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (normalized.startsWith("#")) {
        const codePoint = Number.parseInt(normalized.slice(1), 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      return named[normalized] ?? match;
    },
  );
}

function extractPlainText(source: string, contentType: string): string {
  const withoutExecutableBlocks =
    contentType === "text/plain"
      ? source
      : source
          .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
          .replace(/<!--([\s\S]*?)-->/g, " ")
          .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutExecutableBlocks)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARACTERS);
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new PublicFetchError("The public page is larger than 1 MB.");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function fetchPublicPage(
  input: string,
  dependencies: FetchPublicPageDependencies = {},
): Promise<{ normalizedUrl: string; text: string }> {
  const fetchImpl = dependencies.fetchImpl ?? ((url, init) => fetch(url, init));
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, dependencies.timeoutMs ?? FETCH_TIMEOUT_MS);

  try {
    let currentUrl = await validatePublicUrl(input, dependencies.resolver);
    let redirects = 0;

    while (true) {
      let response: Response;
      try {
        response = await fetchImpl(currentUrl, {
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "text/html, application/xhtml+xml, text/plain;q=0.9",
            "User-Agent": "Parking-Anything-Build-Week-Demo/1.0",
          },
        });
      } catch {
        if (timedOut || controller.signal.aborted) {
          throw new PublicFetchError("The public page fetch timed out.");
        }
        throw new PublicFetchError("The public page could not be fetched.");
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new PublicFetchError("The public page returned an invalid redirect.");
        }
        if (redirects >= MAX_REDIRECTS) {
          throw new PublicFetchError("The public page redirected too many times.");
        }

        let redirectTarget: string;
        try {
          redirectTarget = new URL(location, currentUrl).toString();
        } catch {
          throw new PublicFetchError("The public page returned an invalid redirect.");
        }
        currentUrl = await validatePublicUrl(redirectTarget, dependencies.resolver);
        redirects += 1;
        continue;
      }

      if (!response.ok) {
        throw new PublicFetchError("The public page returned an unsuccessful response.");
      }

      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
        throw new PublicFetchError("The public page is larger than 1 MB.");
      }

      const contentType = (response.headers.get("content-type") ?? "")
        .split(";", 1)[0]
        .trim()
        .toLowerCase();
      if (!ACCEPTED_CONTENT_TYPES.has(contentType)) {
        throw new PublicFetchError("The public URL did not return readable page text.");
      }

      let body: Uint8Array;
      try {
        body = await readBoundedBody(response);
      } catch (error) {
        if (error instanceof PublicFetchError) throw error;
        if (timedOut || controller.signal.aborted) {
          throw new PublicFetchError("The public page fetch timed out.");
        }
        throw new PublicFetchError("The public page could not be read.");
      }

      return {
        normalizedUrl: currentUrl,
        text: extractPlainText(new TextDecoder().decode(body), contentType),
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}
