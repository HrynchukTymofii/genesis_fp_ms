"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireMember } from "@/lib/session";
import { kyivToday } from "@/lib/dates";
import { REPORT_STATUSES } from "@/lib/labels";

const schema = z.object({
  done: z.string().trim().min(1, "Напишіть, що зроблено.").max(4000),
  next: z.string().trim().min(1, "Напишіть, що далі.").max(4000),
  blockers: z.string().trim().max(4000).default(""),
  status: z.enum(REPORT_STATUSES),
});

export type ReportState = { ok?: boolean; error?: string };

/** One report per member per Kyiv day; posting again updates it. */
export async function submitReport(_: ReportState, formData: FormData): Promise<ReportState> {
  const me = await requireMember();
  const parsed = schema.safeParse({
    done: formData.get("done"),
    next: formData.get("next"),
    blockers: formData.get("blockers") ?? "",
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Перевірте поля." };
  const date = kyivToday();
  await db
    .insert(reports)
    .values({ memberId: me.id, date, ...parsed.data })
    .onConflictDoUpdate({
      target: [reports.memberId, reports.date],
      set: { ...parsed.data, createdAt: new Date() },
    });
  revalidatePath("/", "layout");
  return { ok: true };
}
