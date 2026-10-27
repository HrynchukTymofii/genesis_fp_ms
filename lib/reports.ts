import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { reportSlots } from "@/lib/reportSlots";

/** All required-report slots, derived from the sync meetings. */
export const getReportSlots = cache(async () =>
  reportSlots(
    await db
      .select({ id: meetings.id, kind: meetings.kind, startsAt: meetings.startsAt })
      .from(meetings)
      .where(eq(meetings.kind, "sync"))
      .orderBy(asc(meetings.startsAt)),
  ),
);
