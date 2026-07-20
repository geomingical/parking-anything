import type { ParkingItem, PatrolCandidate } from "./schemas";
import { activityAge } from "./activity";

export function selectPatrolCandidates(
  items: ParkingItem[],
  now: Date,
): PatrolCandidate[] {
  return items
    .filter(
      (item): item is ParkingItem & { status: "parked" | "test_driving" } =>
        item.status === "parked" || item.status === "test_driving",
    )
    .map((item) => {
      const { daysSinceActivity } = activityAge(item.lastActivityAt, now);
      return {
        id: item.id,
        kind: item.kind,
        title: item.title,
        ...(item.effortTier ? { effortTier: item.effortTier } : {}),
        status: item.status,
        daysSinceActivity,
      };
    })
    .sort(
      (left, right) =>
        right.daysSinceActivity - left.daysSinceActivity ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3);
}

export function observedFact(
  candidate: Pick<PatrolCandidate, "kind" | "status" | "daysSinceActivity">,
): string {
  const unit = candidate.daysSinceActivity === 1 ? "day" : "days";
  const location =
    candidate.status === "parked" ? "parked" : "test driving";
  const kind = candidate.kind === "idea" ? "idea" : "tool";
  return `This ${kind} has been ${location} without activity for ${candidate.daysSinceActivity} ${unit}.`;
}
