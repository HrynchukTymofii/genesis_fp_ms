import "server-only";
import { asc } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { directions, members } from "@/db/schema";

export const getMembers = cache(() => db.select().from(members).orderBy(asc(members.name)));

export const getDirections = cache(() =>
  db.select().from(directions).orderBy(asc(directions.sortOrder)),
);

export type Lookup = {
  memberName: (id: number | null | undefined) => string | null;
  direction: (slug: string) => Awaited<ReturnType<typeof getDirections>>[number] | undefined;
};

export async function getLookup(): Promise<Lookup> {
  const [ms, ds] = await Promise.all([getMembers(), getDirections()]);
  const mm = new Map(ms.map((m) => [m.id, m.name]));
  const dm = new Map(ds.map((d) => [d.slug, d]));
  return {
    memberName: (id) => (id == null ? null : (mm.get(id) ?? null)),
    direction: (slug) => dm.get(slug),
  };
}

export { shortName } from "@/lib/names";
