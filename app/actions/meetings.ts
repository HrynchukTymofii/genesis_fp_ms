"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { decisions, meetings } from "@/db/schema";
import { requireMember } from "@/lib/session";
import { kyivToUtc } from "@/lib/dates";
import { MEETING_KINDS } from "@/lib/labels";

const meetingSchema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву.").max(200),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Вкажіть дату й час."),
  durationMin: z.coerce.number().int().min(5).max(480),
  agenda: z.string().max(4000),
  kind: z.enum(MEETING_KINDS),
  meetUrl: z
    .string()
    .trim()
    .max(500)
    .transform((u) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u))
    .pipe(z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Посилання на дзвінок має бути URL." })])),
});

export type MeetingState = { ok?: boolean; error?: string };

function parse(formData: FormData) {
  return meetingSchema.safeParse({
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    durationMin: formData.get("durationMin"),
    agenda: formData.get("agenda") ?? "",
    kind: formData.get("kind"),
    meetUrl: formData.get("meetUrl") ?? "",
  });
}

export async function saveMeeting(_: MeetingState, formData: FormData): Promise<MeetingState> {
  await requireMember();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const values = {
    ...parsed.data,
    startsAt: kyivToUtc(parsed.data.startsAt),
    meetUrl: parsed.data.meetUrl || null,
  };
  const id = Number(formData.get("id") || 0);
  if (id) await db.update(meetings).set(values).where(eq(meetings.id, id));
  else await db.insert(meetings).values(values);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteMeeting(id: number): Promise<void> {
  await requireMember();
  await db.delete(meetings).where(eq(meetings.id, id));
  revalidatePath("/", "layout");
}

export async function saveMeetingNotes(id: number, notes: unknown): Promise<void> {
  await requireMember();
  await db.update(meetings).set({ notes }).where(eq(meetings.id, id));
  revalidatePath("/meetings");
}

export async function addDecision(meetingId: number | null, text: string): Promise<void> {
  const me = await requireMember();
  const t = z.string().trim().min(1).max(1000).parse(text);
  await db.insert(decisions).values({ meetingId, text: t, createdBy: me.id });
  revalidatePath("/meetings");
}

export async function deleteDecision(id: number): Promise<void> {
  await requireMember();
  await db.delete(decisions).where(eq(decisions.id, id));
  revalidatePath("/meetings");
}
