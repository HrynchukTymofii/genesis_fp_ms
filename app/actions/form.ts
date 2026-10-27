"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { formResponses, interests } from "@/db/schema";
import { NOTE_REQUIRED_FROM } from "@/lib/labels";
import { requireMember } from "@/lib/session";

const schema = z.object({
  hoursPerWeek: z.string().max(20),
  awayDates: z.string().trim().max(1000),
  willingToPresent: z.enum(["yes", "maybe", "no", ""]),
  skills: z.string().trim().max(2000),
  interests: z.array(
    z.object({
      directionSlug: z.string(),
      score: z.number().int().min(1).max(10),
      note: z.string().trim().max(300),
    }).refine((i) => i.score < NOTE_REQUIRED_FROM || i.note.length > 0, {
      message: "Для оцінки 8–10 напишіть, що ви тут вмієте.",
    }),
  ),
});

export type FormInput = z.input<typeof schema>;

export async function saveForm(input: FormInput): Promise<void> {
  const me = await requireMember();
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Перевірте відповіді.");
  const d = parsed.data;
  const values = {
    hoursPerWeek: d.hoursPerWeek || null,
    awayDates: d.awayDates,
    willingToPresent: d.willingToPresent || null,
    skills: d.skills,
    updatedAt: new Date(),
  };
  await db.transaction(async (tx) => {
    await tx
      .insert(formResponses)
      .values({ memberId: me.id, ...values })
      .onConflictDoUpdate({ target: formResponses.memberId, set: values });
    for (const i of d.interests) {
      await tx
        .insert(interests)
        .values({ memberId: me.id, ...i })
        .onConflictDoUpdate({
          target: [interests.memberId, interests.directionSlug],
          set: { score: i.score, note: i.note },
        });
    }
  });
  revalidatePath("/form");
  revalidatePath("/roles");
}
