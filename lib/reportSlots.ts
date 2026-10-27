// Required reports: every sync meeting asks each member for a report,
// due REPORT_LEAD_HOURS before the sync starts. Pure functions, no DB.

export const REPORT_LEAD_HOURS = 2;

export type SlotMeeting = { id: number; kind: string; startsAt: Date };
export type ReportSlot = { meetingId: number; startsAt: Date; dueAt: Date };

/** One slot per sync meeting, oldest first. */
export function reportSlots(meetings: SlotMeeting[]): ReportSlot[] {
  return meetings
    .filter((m) => m.kind === "sync")
    .map((m) => ({
      meetingId: m.id,
      startsAt: m.startsAt,
      dueAt: new Date(m.startsAt.getTime() - REPORT_LEAD_HOURS * 3600_000),
    }))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** The sync people are reporting for right now: the first one that has not started yet. */
export function currentSlot(slots: ReportSlot[], now: Date): ReportSlot | null {
  return slots.find((s) => s.startsAt > now) ?? null;
}

/**
 * What one member sees at the top of Reports: every past-deadline report they
 * have not filled, plus the current one (filled or not). Later syncs stay hidden.
 */
export function slotsToShow(slots: ReportSlot[], filled: Set<number>, now: Date): ReportSlot[] {
  const current = currentSlot(slots, now);
  return slots.filter(
    (s) => s.meetingId === current?.meetingId || (s.dueAt <= now && !filled.has(s.meetingId)),
  );
}

/** Slot the form opens on: the oldest unfilled overdue one, else the current one. */
export function defaultSlot(slots: ReportSlot[], filled: Set<number>, now: Date): ReportSlot | null {
  return slots.find((s) => s.dueAt <= now && !filled.has(s.meetingId)) ?? currentSlot(slots, now);
}
