"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { requireMember } from "@/lib/session";
import { RESOURCE_CATEGORIES, RESOURCE_KINDS } from "@/lib/labels";

const categoryKeys = RESOURCE_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const kindKeys = RESOURCE_KINDS.map((k) => k.key) as [string, ...string[]];

const schema = z.object({
  title: z.string().trim().min(1, "Вкажіть назву.").max(200),
  url: z
    .string()
    .trim()
    .max(2000)
    .transform((u) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u))
    .pipe(z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Це не схоже на посилання." })])),
  category: z.enum(categoryKeys),
  kind: z.enum(kindKeys),
  directionSlug: z.string().nullable(),
  note: z.string().trim().max(1000),
});

export type ResourceInput = z.input<typeof schema>;
export type ResourceResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/resources");
  revalidatePath("/", "layout");
}

export async function saveResource(id: number | null, input: ResourceInput): Promise<ResourceResult> {
  const me = await requireMember();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Перевірте поля." };
  const values = { ...parsed.data, url: parsed.data.url || null, directionSlug: parsed.data.directionSlug || null };
  if (id) {
    await db
      .update(resources)
      .set({ ...values, updatedBy: me.id, updatedAt: new Date() })
      .where(eq(resources.id, id));
  } else {
    await db.insert(resources).values({ ...values, sortOrder: 1000, createdBy: me.id, updatedBy: me.id });
  }
  revalidate();
  return { ok: true };
}

export async function deleteResource(id: number): Promise<void> {
  await requireMember();
  await db.delete(resources).where(eq(resources.id, id));
  revalidate();
}

export async function uploadResourceFile(formData: FormData): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
  await requireMember();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: false, error: "Файлове сховище не налаштовано." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Оберіть файл." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Файл більший за 10 МБ." };
  const { put } = await import("@vercel/blob");
  const blob = await put(`resources/${file.name}`, file, { access: "public", addRandomSuffix: true });
  return { ok: true, url: blob.url, name: file.name };
}
