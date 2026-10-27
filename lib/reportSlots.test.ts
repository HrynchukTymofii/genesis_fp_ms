import { describe, expect, it } from "vitest";
import { currentSlot, defaultSlot, reportSlots, slotsToShow } from "./reportSlots";

const at = (iso: string) => new Date(iso);
const meetings = [
  { id: 1, kind: "other", startsAt: at("2026-10-27T17:30:00Z") },
  { id: 3, kind: "sync", startsAt: at("2026-11-02T18:00:00Z") },
  { id: 2, kind: "sync", startsAt: at("2026-10-29T18:00:00Z") },
  { id: 4, kind: "sync", startsAt: at("2026-11-05T18:00:00Z") },
];
const slots = reportSlots(meetings);
const ids = (s: { meetingId: number }[]) => s.map((x) => x.meetingId);

describe("report slots", () => {
  it("makes one slot per sync, due 2 hours before, oldest first", () => {
    expect(ids(slots)).toEqual([2, 3, 4]);
    expect(slots[0].dueAt.toISOString()).toBe("2026-10-29T16:00:00.000Z");
  });

  it("shows only the next report before any deadline", () => {
    const now = at("2026-10-27T12:00:00Z");
    expect(ids(slotsToShow(slots, new Set(), now))).toEqual([2]);
  });

  it("keeps the current slot between the deadline and the sync", () => {
    const now = at("2026-10-29T17:00:00Z");
    expect(currentSlot(slots, now)?.meetingId).toBe(2);
    expect(ids(slotsToShow(slots, new Set(), now))).toEqual([2]);
  });

  it("lists unfilled overdue reports plus the next one", () => {
    const now = at("2026-11-03T10:00:00Z");
    expect(ids(slotsToShow(slots, new Set(), now))).toEqual([2, 3, 4]);
    expect(ids(slotsToShow(slots, new Set([2]), now))).toEqual([3, 4]);
    expect(defaultSlot(slots, new Set([2]), now)?.meetingId).toBe(3);
    expect(defaultSlot(slots, new Set([2, 3]), now)?.meetingId).toBe(4);
  });

  it("has nothing left after the last sync once everything is filled", () => {
    const now = at("2026-11-06T10:00:00Z");
    expect(slotsToShow(slots, new Set([2, 3, 4]), now)).toEqual([]);
    expect(defaultSlot(slots, new Set([2, 3, 4]), now)).toBeNull();
  });
});
