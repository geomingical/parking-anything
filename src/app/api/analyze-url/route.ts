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
          return Response.json(
            { error: "Enter one valid public HTTP(S) URL." },
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
