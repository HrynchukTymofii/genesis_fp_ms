"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { niches, votes } from "@/db/schema";
import { requireLead, requireMember } from "@/lib/session";

const s = z.number().int().min(1).max(5);
const voteSchema = z.object({ pain: s, reach: s, buildable: s, money: s, growth: s });

export async function saveVote(nicheId: number, input: z.input<typeof voteSchema>): Promise<void> {
  const me = await requireMember();
  const v = voteSchema.parse(input);
  await db
    .insert(votes)
    .values({ memberId: me.id, nicheId, ...v })
    .onConflictDoUpdate({
      target: [votes.memberId, votes.nicheId],
      set: { ...v, updatedAt: new Date() },
    });
  revalidatePath("/vote");
}

export async function setNicheActive(nicheId: number, active: boolean): Promise<void> {
  await requireLead();
  await db.update(niches).set({ active }).where(eq(niches.id, nicheId));
  revalidatePath("/vote");
  revalidatePath("/form");
}
