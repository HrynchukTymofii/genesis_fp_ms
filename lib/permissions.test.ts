import { describe, expect, it } from "vitest";
import { canMarkDone, effectiveReviewerId } from "./permissions";

const dir = { slug: "research", ownerId: 2, reviewerId: 3 };
const task = { ownerId: null, reviewerId: null, directionSlug: "research" };

describe("Done rule", () => {
  it("falls back to the direction reviewer", () => {
    expect(effectiveReviewerId(task, dir)).toBe(3);
    expect(effectiveReviewerId({ ...task, reviewerId: 5 }, dir)).toBe(5);
  });
  it("allows only the reviewer or the lead", () => {
    expect(canMarkDone({ id: 3, isLead: false }, task, dir)).toBe(true);
    expect(canMarkDone({ id: 2, isLead: false }, task, dir)).toBe(false); // owner can't
    expect(canMarkDone({ id: 9, isLead: true }, task, dir)).toBe(true);
    expect(canMarkDone(null, task, dir)).toBe(false);
  });
});
