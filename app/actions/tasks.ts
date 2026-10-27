"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { directions, members, taskLinks, tasks } from "@/db/schema";
import { requireMember } from "@/lib/session";
import { canMarkDone, doneRefusal, effectiveReviewerId } from "@/lib/permissions";
import { TASK_STATUSES, type TaskStatus } from "@/lib/labels";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateTaskViews(id?: number) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/tasks/${id}`);
}

async function loadTaskWithDirection(id: number) {
  const [row] = await db
    .select({ task: tasks, direction: directions })
    .from(tasks)
    .innerJoin(directions, eq(tasks.directionSlug, directions.slug))
    .where(eq(tasks.id, id));
  return row ?? null;
}

const statusSchema = z.enum(TASK_STATUSES);

/** Moves a task to a new status, enforcing the Done rule server-side. */
export async function moveTask(id: number, status: TaskStatus): Promise<ActionResult> {
  const me = await requireMember();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Невідомий статус." };
  const row = await loadTaskWithDirection(id);
  if (!row) return { ok: false, error: "Задачу не знайдено." };
  const { task, direction } = row;
  if (task.status === status) return { ok: true };

  if (status === "done" && !canMarkDone(me, task, direction)) {
    const reviewerId = effectiveReviewerId(task, direction);
    const [rev] = reviewerId
      ? await db.select().from(members).where(eq(members.id, reviewerId))
      : [];
    return { ok: false, error: doneRefusal(rev?.name) };
  }

  await db
    .update(tasks)
    .set({
      status,
      doneAt: status === "done" ? new Date() : null,
      updatedBy: me.id,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  revalidateTaskViews(id);
  return { ok: true };
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(300),
  directionSlug: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: statusSchema.optional(),
});

export async function createTask(input: z.input<typeof createSchema>): Promise<number> {
  const me = await requireMember();
  const data = createSchema.parse(input);
  const status = data.status === "done" ? "review" : (data.status ?? "todo");
  const [row] = await db
    .insert(tasks)
    .values({
      title: data.title,
      directionSlug: data.directionSlug,
      dueDate: data.dueDate ?? null,
      status,
      createdBy: me.id,
      updatedBy: me.id,
    })
    .returning({ id: tasks.id });
  revalidateTaskViews();
  return row.id;
}

const updateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  directionSlug: z.string().min(1).optional(),
  ownerId: z.number().int().nullable().optional(),
  reviewerId: z.number().int().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

/** Updates plain properties. Status changes go through moveTask. */
export async function updateTask(
  id: number,
  patch: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const me = await requireMember();
  const data = updateSchema.parse(patch);
  await db
    .update(tasks)
    .set({ ...data, updatedBy: me.id, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidateTaskViews(id);
  return { ok: true };
}

export async function saveTaskBody(id: number, body: unknown): Promise<void> {
  const me = await requireMember();
  await db
    .update(tasks)
    .set({ body, updatedBy: me.id, updatedAt: new Date() })
    .where(eq(tasks.id, id));
  revalidatePath(`/tasks/${id}`);
}

export async function deleteTask(id: number): Promise<void> {
  await requireMember();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidateTaskViews();
}

const linkSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().trim().max(200).optional(),
});

export async function addTaskLink(
  taskId: number,
  input: { url: string; title?: string },
): Promise<ActionResult> {
  const me = await requireMember();
  const raw = input.url.trim();
  const parsed = linkSchema.safeParse({
    url: /^https?:\/\//i.test(raw) ? raw : `https://${raw}`,
    title: input.title,
  });
  if (!parsed.success) return { ok: false, error: "Це не схоже на посилання." };
  await db.insert(taskLinks).values({
    taskId,
    url: parsed.data.url,
    title: parsed.data.title || null,
    kind: "link",
    createdBy: me.id,
  });
  revalidateTaskViews(taskId);
  return { ok: true };
}

export async function removeTaskLink(linkId: number): Promise<void> {
  await requireMember();
  const [l] = await db.delete(taskLinks).where(eq(taskLinks.id, linkId)).returning();
  revalidateTaskViews(l?.taskId);
}

export async function attachTaskFile(taskId: number, formData: FormData): Promise<ActionResult> {
  const me = await requireMember();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: false, error: "Файлове сховище не налаштовано." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Оберіть файл." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Файл більший за 10 МБ." };
  const { put } = await import("@vercel/blob");
  const blob = await put(`tasks/${taskId}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  await db.insert(taskLinks).values({
    taskId,
    url: blob.url,
    title: file.name,
    kind: "file",
    createdBy: me.id,
  });
  revalidateTaskViews(taskId);
  return { ok: true };
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;

/** Everything the task panel/page needs in one call. */
export async function getTaskDetail(id: number) {
  const row = await loadTaskWithDirection(id);
  if (!row) return null;
  const links = await db
    .select()
    .from(taskLinks)
    .where(eq(taskLinks.taskId, id))
    .orderBy(asc(taskLinks.createdAt));
  return { ...row, links };
}
