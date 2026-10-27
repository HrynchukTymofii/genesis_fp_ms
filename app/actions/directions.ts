"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { directions } from "@/db/schema";
import { requireLead, requireMember } from "@/lib/session";

export async function saveDirectionNotes(slug: string, notes: unknown): Promise<void> {
  await requireMember();
  await db.update(directions).set({ notes }).where(eq(directions.slug, slug));
  revalidatePath(`/directions/${slug}`);
}

const rolesSchema = z.object({
  ownerId: z.number().int().nullable().optional(),
  reviewerId: z.number().int().nullable().optional(),
});

/** Lead-only: set owner and/or reviewer of a direction. */
export async function setDirectionRoles(
  slug: string,
  patch: z.input<typeof rolesSchema>,
): Promise<void> {
  await requireLead();
  await db.update(directions).set(rolesSchema.parse(patch)).where(eq(directions.slug, slug));
  revalidatePath("/", "layout");
}

const textSchema = z.object({
  description: z.string().max(2000).optional(),
  deliverables: z.string().max(4000).optional(),
});

export async function updateDirectionText(
  slug: string,
  patch: z.input<typeof textSchema>,
): Promise<void> {
  await requireLead();
  await db.update(directions).set(textSchema.parse(patch)).where(eq(directions.slug, slug));
  revalidatePath(`/directions/${slug}`);
}
