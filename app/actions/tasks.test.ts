// Integration test for the Done rule; runs only when a database is configured.
import { config } from "dotenv";
import { describe, expect, it, vi, beforeAll } from "vitest";

config({ path: ".env.local", quiet: true });

let memberCookie = "";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "sprint_member" ? { value: memberCookie } : undefined) }),
}));

describe.skipIf(!process.env.DATABASE_URL)("moveTask Done rule (DB)", () => {
  let ids: { task: number; reviewer: number; other: number; lead: number | null };

  beforeAll(async () => {
    const { db } = await import("@/db");
    const { directions, members, tasks } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const ms = await db.select().from(members);
    const lead = ms.find((m) => m.isLead) ?? null;
    const [reviewer, other] = ms.filter((m) => m.id !== lead?.id);
    await db.update(directions).set({ reviewerId: reviewer.id }).where(eq(directions.slug, "growth"));
    const [t] = await db.insert(tasks).values({ title: "test: done rule", directionSlug: "growth", status: "review" }).returning();
    ids = { task: t.id, reviewer: reviewer.id, other: other.id, lead: lead?.id ?? null };
  });

  it("refuses a non-reviewer, accepts the reviewer, clears doneAt when leaving done", async () => {
    const { moveTask, deleteTask, getTaskDetail } = await import("./tasks");
    memberCookie = String(ids.other);
    const refused = await moveTask(ids.task, "done");
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatch(/^Тільки .+ може позначити це як готове/);

    memberCookie = String(ids.reviewer);
    expect((await moveTask(ids.task, "done")).ok).toBe(true);
    expect((await getTaskDetail(ids.task))!.task.doneAt).not.toBeNull();

    memberCookie = String(ids.other);
    expect((await moveTask(ids.task, "doing")).ok).toBe(true);
    expect((await getTaskDetail(ids.task))!.task.doneAt).toBeNull();

    if (ids.lead) {
      memberCookie = String(ids.lead);
      expect((await moveTask(ids.task, "done")).ok).toBe(true); // lead override
    }
    await deleteTask(ids.task);
  });
});
