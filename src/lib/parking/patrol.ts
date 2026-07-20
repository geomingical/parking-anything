import type { ParkingItem, PatrolCandidate } from "./schemas";

const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

export function selectPatrolCandidates(
  items: ParkingItem[],
  now: Date,
): PatrolCandidate[] {
  return items
    .filter(
      (item): item is ParkingItem & { status: "parked" | "test_driving" } =>
        item.status === "parked" || item.status === "test_driving",
    )
    .map((item) => ({
      id: item.id,
      title: item.title,
      effortTier: item.effortTier,
      status: item.status,
      daysSinceActivity: Math.max(
        0,
        Math.floor(
          (now.getTime() - new Date(item.lastActivityAt).getTime()) /
            DAY_MILLISECONDS,
        ),
      ),
    }))
    .sort(
      (left, right) =>
        right.daysSinceActivity - left.daysSinceActivity ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 3);
}

export function observedFact(
  candidate: Pick<PatrolCandidate, "status" | "daysSinceActivity">,
): string {
  const unit = candidate.daysSinceActivity === 1 ? "day" : "days";
  const location =
    candidate.status === "parked" ? "parked" : "test driving";
  return `This tool has been ${location} without activity for ${candidate.daysSinceActivity} ${unit}.`;
}
