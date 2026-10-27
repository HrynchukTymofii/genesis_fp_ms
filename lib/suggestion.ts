import "server-only";
import { db } from "@/db";
import { interests } from "@/db/schema";
import { getDirections, getMembers } from "@/lib/queries";
import { suggestRoles } from "@/lib/matching";

/** Loads form scores and runs the matching algorithm. */
export async function computeSuggestion() {
  const [ms, ds, rows] = await Promise.all([getMembers(), getDirections(), db.select().from(interests)]);
  const scores: Record<number, Record<string, number>> = {};
  for (const r of rows) (scores[r.memberId] ??= {})[r.directionSlug] = r.score;
  const result = suggestRoles({
    members: ms.map((m) => ({ id: m.id, name: m.name })),
    scores,
    leadId: ms.find((m) => m.isLead)?.id ?? null,
    directions: ds.map((d) => d.slug),
  });
  // Apply the lead's per-row swaps (owner <-> reviewer) on top of the algorithm.
  const swapped = new Set(ds.filter((d) => d.swapSuggestion).map((d) => d.slug));
  for (const slug of swapped) {
    [result.owners[slug], result.reviewers[slug]] = [result.reviewers[slug] ?? null, result.owners[slug] ?? null];
  }
  return { result, scores, swapped };
}
