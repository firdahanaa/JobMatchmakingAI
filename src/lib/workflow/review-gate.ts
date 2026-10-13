export function getUnreviewedApplicationIds(
  completedApplicationIds: readonly string[],
  reviewedApplicationIds: readonly string[]
): string[] {
  const reviewedIds = new Set(reviewedApplicationIds);
  return completedApplicationIds.filter((applicationId) => !reviewedIds.has(applicationId));
}
