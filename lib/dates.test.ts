import { describe, expect, it } from "vitest";
import { daysToPitch, kyivToday, weekRange } from "./dates";

describe("Kyiv dates", () => {
  it("uses Kyiv time for today", () => {
    // 23:30 UTC on Oct 27 is already Oct 28 in Kyiv (UTC+2 after DST ends)
    expect(kyivToday(new Date("2026-10-27T23:30:00Z"))).toBe("2026-10-28");
  });
  it("counts days to the pitch", () => {
    expect(daysToPitch("2026-10-27")).toBe(20);
    expect(daysToPitch("2026-11-16")).toBe(0);
  });
  it("returns Monday..Sunday", () => {
    expect(weekRange("2026-10-29")).toEqual(["2026-10-26", "2026-11-01"]);
  });
});
