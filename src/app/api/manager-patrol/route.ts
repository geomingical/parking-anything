import { z } from "zod";

import {
  ManagerPatrolResponseSchema,
  PatrolCandidateSchema,
  type ManagerPatrolResponse,
  type PatrolCandidate,
} from "@/lib/parking/schemas";
import { managerPatrol } from "@/lib/server/manager-patrol";
import {
  createProductionQuotaGate,
  getClientIp,
  type QuotaGate,
} from "@/lib/server/rate-limit";
import { errorResponse, readBoundedJson } from "@/lib/server/request";

export const runtime = "nodejs";
export const maxDuration = 15;

const InputSchema = z
  .object({
    candidates: z.array(PatrolCandidateSchema).max(3),
  })
  .strict();

const INPUT_ERROR =
  "Submit up to three valid patrol candidates with unique IDs.";

type ManagerPatrolRouteDependencies = {
  quotaGate: QuotaGate;
  patrol: (candidates: PatrolCandidate[]) => Promise<ManagerPatrolResponse>;
};

export function createManagerPatrolRoute(
  dependencies: ManagerPatrolRouteDependencies,
) {
  return async function POST(request: Request): Promise<Response> {
    try {
      let input: z.infer<typeof InputSchema>;
      try {
        input = InputSchema.parse(await readBoundedJson(request));
        const ids = input.candidates.map(({ id }) => id);
        if (new Set(ids).size !== ids.length) {
          return Response.json({ error: INPUT_ERROR }, { status: 400 });
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return Response.json({ error: INPUT_ERROR }, { status: 400 });
        }
        throw error;
      }

      if (input.candidates.length === 0) {
        return Response.json(
          ManagerPatrolResponseSchema.parse({ recommendations: [] }),
        );
      }

      await dependencies.quotaGate.consume({ ip: getClientIp(request) });
      return Response.json(await dependencies.patrol(input.candidates));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

let productionQuotaGate: QuotaGate | undefined;

export async function POST(request: Request): Promise<Response> {
  try {
    productionQuotaGate ??= createProductionQuotaGate();
    return await createManagerPatrolRoute({
      quotaGate: productionQuotaGate,
      patrol: managerPatrol,
    })(request);
  } catch (error) {
    return errorResponse(error);
  }
}
