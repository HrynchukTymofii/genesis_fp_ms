// Integration test: editing a meeting's Kyiv time and Meet link. Runs only with a database.
import { config } from "dotenv";
import { describe, expect, it, vi } from "vitest";

config({ path: ".env.local", quiet: true });

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (n: string) => (n === "sprint_member" ? { value: "1" } : undefined) }) }));

describe.skipIf(!process.env.DATABASE_URL)("saveMeeting (DB)", () => {
  it("saves Kyiv date/time and the Google Meet link", async () => {
    const { db } = await import("@/db");
    const { meetings, members } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { saveMeeting } = await import("./meetings");
    const [m] = await db.select().from(members).limit(1);
    vi.doMock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: String(m.id) }) }) }));

    const [row] = await db.insert(meetings).values({ title: "test meeting", startsAt: new Date(), kind: "other" }).returning();
    const fd = new FormData();
    Object.entries({ id: String(row.id), title: "Синк (перенесено)", startsAt: "2026-11-03T21:15", durationMin: "45", agenda: "", kind: "sync", meetUrl: "meet.google.com/abc-defg-hij" }).forEach(([k, v]) => fd.set(k, v));
    expect(await saveMeeting({}, fd)).toEqual({ ok: true });

    const [saved] = await db.select().from(meetings).where(eq(meetings.id, row.id));
    expect(saved.startsAt.toISOString()).toBe("2026-11-03T19:15:00.000Z"); // Kyiv is UTC+2 in November
    expect(saved.durationMin).toBe(45);
    expect(saved.meetUrl).toBe("https://meet.google.com/abc-defg-hij");

    fd.set("meetUrl", "not a link at all");
    expect((await saveMeeting({}, fd)).error).toBeTruthy();
    await db.delete(meetings).where(eq(meetings.id, row.id));
  });
});
