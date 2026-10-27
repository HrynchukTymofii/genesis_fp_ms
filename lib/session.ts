import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { members, type Member } from "@/db/schema";
import { isUnlocked, UNLOCK_COOKIE } from "@/lib/passcode";

export const MEMBER_COOKIE = "sprint_member";

export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const raw = (await cookies()).get(MEMBER_COOKIE)?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id)) return null;
  const [m] = await db.select().from(members).where(eq(members.id, id));
  return m ?? null;
});

/** For Server Actions: every write needs the passcode (if set) and a known member. */
export async function requireMember(): Promise<Member> {
  const jar = await cookies();
  if (!(await isUnlocked(jar.get(UNLOCK_COOKIE)?.value))) throw new Error("Спершу введіть код команди.");
  const m = await getCurrentMember();
  if (!m) throw new Error("Спершу оберіть, хто ви.");
  return m;
}

export async function requireLead(): Promise<Member> {
  const m = await requireMember();
  if (!m.isLead) throw new Error("У вас немає прав на цю дію.");
  return m;
}
