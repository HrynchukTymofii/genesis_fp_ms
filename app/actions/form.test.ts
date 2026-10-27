// Integration test: saving the team form (notes are optional). Runs only with a database.
import { config } from "dotenv";
import { describe, expect, it, vi } from "vitest";

config({ path: ".env.local", quiet: true });

let memberCookie = "";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "sprint_member" ? { value: memberCookie } : undefined) }),
}));

describe.skipIf(!process.env.DATABASE_URL)("saveForm (DB)", () => {
  it("allows an empty note below 8 and requires one for 8–10", async () => {
    const { db } = await import("@/db");
    const { formResponses, interests, members } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { saveForm } = await import("./form");
    const [m] = await db.select().from(members).where(eq(members.isLead, false)).limit(1);
    memberCookie = String(m.id);
    const before = await db.select().from(formResponses).where(eq(formResponses.memberId, m.id));

    await saveForm({
      hoursPerWeek: "6–10",
      awayDates: "",
      willingToPresent: "maybe",
      skills: "",
      interests: [{ directionSlug: "research", score: 7, note: "" }],
    });
    const base = { hoursPerWeek: "6–10", awayDates: "", willingToPresent: "maybe" as const, skills: "" };
    await expect(
      saveForm({ ...base, interests: [{ directionSlug: "research", score: 8, note: "  " }] }),
    ).rejects.toThrow("Для оцінки 8–10");
    await saveForm({ ...base, interests: [{ directionSlug: "research", score: 8, note: "Провела 20 інтерв’ю" }] });
    const [i] = await db.select().from(interests).where(eq(interests.memberId, m.id));
    expect(i).toMatchObject({ directionSlug: "research", score: 8, note: "Провела 20 інтерв’ю" });

    if (before.length === 0) {
      await db.delete(interests).where(eq(interests.memberId, m.id));
      await db.delete(formResponses).where(eq(formResponses.memberId, m.id));
    }
  });
});
