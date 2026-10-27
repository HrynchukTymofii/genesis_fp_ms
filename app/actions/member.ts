"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { MEMBER_COOKIE } from "@/lib/session";
import { isUnlocked, passcodeToken, safeNext, UNLOCK_COOKIE } from "@/lib/passcode";

const HALF_YEAR = 60 * 60 * 24 * 180;

export async function pickMember(memberId: number) {
  const jar = await cookies();
  if (!(await isUnlocked(jar.get(UNLOCK_COOKIE)?.value))) throw new Error("Спершу введіть код команди.");
  const [m] = await db.select().from(members).where(eq(members.id, memberId));
  if (!m) throw new Error("Такого учасника немає.");
  jar.set(MEMBER_COOKIE, String(m.id), {
    maxAge: HALF_YEAR,
    sameSite: "lax",
    path: "/",
  });
}

export async function switchMember() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function setTheme(theme: "light" | "dark" | "system") {
  const jar = await cookies();
  if (theme === "system") jar.delete("theme");
  else jar.set("theme", theme, { maxAge: HALF_YEAR, sameSite: "lax", path: "/" });
}

export async function unlock(_: unknown, formData: FormData): Promise<{ error?: string }> {
  const passcode = process.env.TEAM_PASSCODE;
  const given = String(formData.get("passcode") ?? "");
  const next = safeNext(formData.get("next"));
  if (!passcode) redirect(next);
  if (given !== passcode) return { error: "Неправильний код. Спробуйте ще раз." };
  (await cookies()).set(UNLOCK_COOKIE, await passcodeToken(passcode), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: HALF_YEAR,
    path: "/",
  });
  redirect(next);
}
