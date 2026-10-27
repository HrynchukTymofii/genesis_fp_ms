import "server-only";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { taskLinks, tasks } from "@/db/schema";
import { getDirections } from "@/lib/queries";
import { effectiveOwnerId, effectiveReviewerId } from "@/lib/permissions";
import type { TaskStatus } from "@/lib/labels";

/** Plain, serializable task shape used by cards and boards. */
export type CardTask = {
  id: number;
  title: string;
  directionSlug: string;
  status: TaskStatus;
  dueDate: string | null;
  doneAt: string | null;
  ownerId: number | null; // effective (falls back to the direction)
  reviewerId: number | null; // effective
  linkCount: number;
};

export async function getCardTasks(): Promise<CardTask[]> {
  const [rows, dirs, counts] = await Promise.all([
    db.select().from(tasks),
    getDirections(),
    db.select({ taskId: taskLinks.taskId, n: count() }).from(taskLinks).groupBy(taskLinks.taskId),
  ]);
  const dm = new Map(dirs.map((d) => [d.slug, d]));
  const cm = new Map(counts.map((c) => [c.taskId, c.n]));
  return rows.map((t) => {
    const d = dm.get(t.directionSlug);
    return {
      id: t.id,
      title: t.title,
      directionSlug: t.directionSlug,
      status: t.status as TaskStatus,
      dueDate: t.dueDate,
      doneAt: t.doneAt?.toISOString() ?? null,
      ownerId: effectiveOwnerId(t, d),
      reviewerId: effectiveReviewerId(t, d),
      linkCount: cm.get(t.id) ?? 0,
    };
  });
}

export const byDue = (a: CardTask, b: CardTask) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.id - b.id;
