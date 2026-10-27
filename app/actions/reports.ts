"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { meetings, reports } from "@/db/schema";
import { requireMember } from "@/lib/session";
import { kyivDateOf } from "@/lib/dates";
import { REPORT_STATUSES } from "@/lib/labels";

const link = z.object({
  url: z
    .string()
    .trim()
    .max(2000)
    .transform((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`))
    .pipe(z.url({ protocol: /^https?$/, error: "Одне з посилань не схоже на адресу." })),
  title: z.string().trim().max(200).default(""),
  kind: z.enum(["link", "file"]).default("link"),
});

const schema = z.object({
  meetingId: z.coerce.number().int().positive(),
  done: z.string().trim().min(1, "Напишіть, що зроблено.").max(4000),
  next: z.string().trim().min(1, "Напишіть, що далі.").max(4000),
  blockers: z.string().trim().max(4000).default(""),
  status: z.enum(REPORT_STATUSES),
  links: z.array(link).max(20, "Не більше 20 посилань."),
});

export type ReportState = { ok?: boolean; error?: string };

/** One report per member per sync meeting; posting again updates it. */
export async function submitReport(_: ReportState, formData: FormData): Promise<ReportState> {
  const me = await requireMember();
  let links: unknown = [];
  try {
    links = JSON.parse(String(formData.get("links") ?? "[]"));
  } catch {}
  const parsed = schema.safeParse({
    meetingId: formData.get("meetingId"),
    done: formData.get("done"),
    next: formData.get("next"),
    blockers: formData.get("blockers") ?? "",
    status: formData.get("status"),
    links,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Перевірте поля." };
  const { meetingId, ...data } = parsed.data;
  const [sync] = await db
    .select({ startsAt: meetings.startsAt })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.kind, "sync")));
  if (!sync) return { error: "Такого синку немає. Оновіть сторінку." };
  await db
    .insert(reports)
    .values({ memberId: me.id, meetingId, date: kyivDateOf(sync.startsAt), ...data })
    .onConflictDoUpdate({
      target: [reports.memberId, reports.meetingId],
      set: { ...data, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
  return { ok: true };
}
