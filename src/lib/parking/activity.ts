const DAY_MILLISECONDS = 86_400_000;

export function activityAge(lastActivityAt: string, now: Date) {
  const daysSinceActivity = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MILLISECONDS,
    ),
  );

  return {
    daysSinceActivity,
    needsReview: daysSinceActivity >= 7,
  };
}
