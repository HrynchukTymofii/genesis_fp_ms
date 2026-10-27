"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { directions } from "@/db/schema";
import { requireLead } from "@/lib/session";
import { computeSuggestion } from "@/lib/suggestion";

/** Lead-only: swap owner and reviewer of one row in the suggestion. */
export async function toggleSuggestionSwap(slug: string): Promise<void> {
  await requireLead();
  await db
    .update(directions)
    .set({ swapSuggestion: sql`not ${directions.swapSuggestion}` })
    .where(eq(directions.slug, slug));
  revalidatePath("/roles");
}

/** Lead-only: write the suggested owners/reviewers to all directions. */
export async function applySuggestion(): Promise<void> {
  await requireLead();
  const { result } = await computeSuggestion();
  await db.transaction(async (tx) => {
    for (const slug of Object.keys(result.owners)) {
      await tx
        .update(directions)
        .set({ ownerId: result.owners[slug], reviewerId: result.reviewers[slug] ?? null })
        .where(eq(directions.slug, slug));
    }
  });
  revalidatePath("/", "layout");
}
