import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { ResourcesClient } from "@/components/ResourcesClient";

export const metadata: Metadata = { title: "Ресурси" };

export default async function ResourcesPage() {
  const rows = await db.select().from(resources).orderBy(asc(resources.sortOrder), asc(resources.createdAt));
  return (
    <div>
      <h1 className="page-title">Ресурси</h1>
      <p className="mb-6 mt-2 max-w-[70ch] text-text2">
        Усі посилання команди в одному місці: презентація продукту, MVP, таблиці з лонг- і шорт-листом, зібрані дані
        та матеріали досліджень.
      </p>
      <ResourcesClient
        rows={rows.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          category: r.category,
          kind: r.kind,
          directionSlug: r.directionSlug,
          note: r.note,
          updatedBy: r.updatedBy,
          updatedAt: r.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
