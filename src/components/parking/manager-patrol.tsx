"use client";

import { ScanSearch } from "lucide-react";
import { useRef, useState } from "react";

import { observedFact, selectPatrolCandidates } from "@/lib/parking/patrol";
import {
  ManagerPatrolResponseSchema,
  type ParkingItem,
  type PatrolCandidate,
  type PatrolRecommendation,
  type SuggestedAction,
} from "@/lib/parking/schemas";

type ManagerPatrolProps = {
  items: ParkingItem[];
  onSelect(id: string): void;
  onPlanTestDrive?(id: string): void;
  onStartTestDrive?(id: string): void;
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  start_test_drive: "Start Test Drive",
  return_to_lot: "Return to Parking Lot",
  scrap: "Tow Away",
};

function responseErrorMessage(response: Response, serverError: string): string {
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    return retryAfter
      ? `${serverError} Try again in ${retryAfter} seconds.`
      : `${serverError} Try again shortly.`;
  }
  if (response.status === 503) {
    return `${serverError} Try again shortly.`;
  }
  return serverError;
}

export function ManagerPatrol({
  items,
  onSelect,
  onPlanTestDrive = onSelect,
  onStartTestDrive = onSelect,
}: ManagerPatrolProps) {
  const [loading, setLoading] = useState(false);
  const [allClear, setAllClear] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<PatrolRecommendation[]>([]);
  const [submittedCandidates, setSubmittedCandidates] = useState<PatrolCandidate[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  async function runPatrol() {
    if (loading) return;

    const candidates = selectPatrolCandidates(items, new Date());
    setError(null);
    setRecommendations([]);
    setSubmittedCandidates(candidates);

    if (candidates.length === 0) {
      setAllClear(true);
      return;
    }

    setAllClear(false);
    setLoading(true);
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch("/api/manager-patrol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates }),
        signal: controller.signal,
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const serverError =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Manager Patrol could not be completed.";
        throw new Error(responseErrorMessage(response, serverError));
      }

      const result = ManagerPatrolResponseSchema.safeParse(body);
      if (!result.success) {
        throw new Error("The patrol response could not be verified. Try again.");
      }
      const submittedIds = new Set(candidates.map(({ id }) => id));
      setRecommendations(
        result.data.recommendations.filter(({ itemId }) =>
          submittedIds.has(itemId),
        ),
      );
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Manager Patrol could not be completed. Try again.",
      );
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setLoading(false);
    }
  }

  const candidatesById = new Map(
    submittedCandidates.map((candidate) => [candidate.id, candidate]),
  );

  return (
    <section
      aria-labelledby="manager-patrol-heading"
      className="mb-5 border-2 border-[var(--ink)] bg-white"
    >
      <div className="flex flex-col gap-4 border-b border-black/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--garage)]">
            Decision support
          </p>
          <h2 id="manager-patrol-heading" className="mt-1 text-lg font-black">
            Manager Patrol
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-ink)]">
            Review the stalest active tools and ideas without automatic changes.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={runPatrol}
          className="inline-flex h-11 min-w-48 items-center justify-center gap-2 bg-[var(--ink)] px-4 text-sm font-black text-white hover:bg-[var(--garage)] disabled:cursor-wait disabled:opacity-70"
        >
          <ScanSearch aria-hidden="true" size={18} />
          {loading ? "Patrolling…" : "Run Manager Patrol"}
        </button>
      </div>

      {allClear ? (
        <p role="status" className="px-4 py-4 text-sm font-bold">
          All clear. No active Parkables need attention.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="border-l-4 border-[var(--scrap)] px-4 py-3 text-sm font-bold">
          {error}
        </p>
      ) : null}

      {recommendations.length > 0 ? (
        <div aria-label="Patrol recommendations">
          {recommendations.map((recommendation) => {
            const candidate = candidatesById.get(recommendation.itemId);
            if (!candidate) return null;
            const currentItem = items.find(({ id }) => id === candidate.id);
            const needsPlanning =
              recommendation.suggestedAction === "start_test_drive" &&
              currentItem?.kind === "idea" &&
              (!currentItem.effortTier || !currentItem.suggestedTestTask?.trim());
            const canStart =
              recommendation.suggestedAction === "start_test_drive" &&
              currentItem?.status === "parked" &&
              !needsPlanning;
            const commandLabel = needsPlanning
              ? "Plan Test Drive"
              : ACTION_LABELS[recommendation.suggestedAction];

            return (
              <article
                key={recommendation.itemId}
                aria-label={`Patrol recommendation for ${candidate.title}`}
                className="grid gap-4 border-t border-black/15 px-4 py-5 first:border-t-0 md:grid-cols-[1fr_1.2fr_auto] md:items-start"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--muted-ink)]">
                    Observed Fact
                  </p>
                  <h3 className="mt-1 font-black">{candidate.title}</h3>
                  <p className="mt-2 text-sm leading-6">
                    {observedFact(candidate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--garage)]">
                    {recommendation.source === "model"
                      ? "GPT-5.6 Recommendation"
                      : "Deterministic fallback"}
                  </p>
                  <p className="mt-1 font-black">{commandLabel}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-ink)]">
                    {recommendation.rationale}
                  </p>
                  {needsPlanning || canStart ? (
                    <button
                      type="button"
                      onClick={() =>
                        needsPlanning
                          ? onPlanTestDrive(candidate.id)
                          : onStartTestDrive(candidate.id)
                      }
                      className="mt-3 h-10 bg-[var(--garage)] px-3 text-sm font-black text-white"
                    >
                      {commandLabel}
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(candidate.id)}
                  className="h-10 border-2 border-[var(--ink)] px-3 text-sm font-black hover:bg-black hover:text-white"
                >
                  Review this car
                </button>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
