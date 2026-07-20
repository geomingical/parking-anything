import { describe, expect, it } from "vitest";

import { activityAge } from "./activity";

describe("activityAge", () => {
  it.each([
    ["2026-07-13T00:00:00.000Z", 7, true],
    ["2026-07-13T00:00:01.000Z", 6, false],
    ["2026-07-21T00:00:00.000Z", 0, false],
  ] as const)(
    "calculates complete clamped days for %s",
    (lastActivityAt, daysSinceActivity, needsReview) => {
      expect(
        activityAge(lastActivityAt, new Date("2026-07-20T00:00:00.000Z")),
      ).toEqual({ daysSinceActivity, needsReview });
    },
  );
});
