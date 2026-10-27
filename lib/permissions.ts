type TaskLike = { ownerId: number | null; reviewerId: number | null; directionSlug: string };
type DirectionLike = { slug: string; ownerId: number | null; reviewerId: number | null };
type MemberLike = { id: number; isLead: boolean };

export function effectiveOwnerId(task: TaskLike, dir?: DirectionLike | null): number | null {
  return task.ownerId ?? dir?.ownerId ?? null;
}

export function effectiveReviewerId(task: TaskLike, dir?: DirectionLike | null): number | null {
  return task.reviewerId ?? dir?.reviewerId ?? null;
}

/** Only the task's reviewer (or the lead) may move a task to Done. */
export function canMarkDone(
  member: MemberLike | null,
  task: TaskLike,
  dir?: DirectionLike | null,
): boolean {
  if (!member) return false;
  if (member.isLead) return true;
  return effectiveReviewerId(task, dir) === member.id;
}

export function doneRefusal(reviewerName: string | null | undefined): string {
  return reviewerName
    ? `Тільки ${reviewerName} може позначити це як готове. Перемістіть у «На перевірці».`
    : "Рецензента ще не призначено, тому позначити це як готове поки не можна. Перемістіть у «На перевірці».";
}
