import { z } from "zod";

import type { AnalyzeUrlResponse } from "@/lib/parking/schemas";
import { LINK_KIND_IDS, type LinkKindId } from "@/lib/parking/link-kinds";
import { analyzeUrl } from "@/lib/server/analyze-url";
import {
  createProductionQuotaGate,
  getClientIp,
  type QuotaGate,
} from "@/lib/server/rate-limit";
import { errorResponse, readBoundedJson } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 20;

const InputSchema = z
  .object({
    url: z.string().max(2_048),
    kind: z.enum(LINK_KIND_IDS).default("ai_tool"),
  })
  .strict();

type AnalyzeRouteDependencies = {
  quotaGate: QuotaGate;
  analyze: (request: {
    url: string;
    kind: LinkKindId;
  }) => Promise<AnalyzeUrlResponse>;
};

export function createAnalyzeRoute(dependencies: AnalyzeRouteDependencies) {
  return async function POST(request: Request): Promise<Response> {
    try {
      await dependencies.quotaGate.consume({ ip: getClientIp(request) });

      let input: z.infer<typeof InputSchema>;
      try {
        input = InputSchema.parse(await readBoundedJson(request));
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Finding 5 fix: a bad `url` and a bad `kind` are different
          // failures and must name the field that's actually wrong. A `url`
          // issue (or an unrecognized top-level key) keeps the existing URL
          // wording; a `kind`-only issue gets its own message instead of
          // being misreported as a URL problem.
          const urlInvalid = error.issues.some((issue) => issue.path[0] === "url");
          const kindInvalid = error.issues.some((issue) => issue.path[0] === "kind");
          return Response.json(
            {
              error:
                !urlInvalid && kindInvalid
                  ? "Choose a supported link kind."
                  : "Enter one valid public HTTP(S) URL.",
            },
            { status: 400 },
          );
        }
        throw error;
      }

      return Response.json(
        await dependencies.analyze({ url: input.url, kind: input.kind }),
      );
    } catch (error) {
      return errorResponse(error);
    }
  };
}

let productionQuotaGate: QuotaGate | undefined;

export async function POST(request: Request): Promise<Response> {
  try {
    productionQuotaGate ??= createProductionQuotaGate();
    return await createAnalyzeRoute({
      quotaGate: productionQuotaGate,
      analyze: analyzeUrl,
    })(request);
  } catch (error) {
    return errorResponse(error);
  }
}
