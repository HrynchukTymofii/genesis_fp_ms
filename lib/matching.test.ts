import { describe, expect, it } from "vitest";
import { suggestRoles, type MatchInput } from "./matching";

const DIRS = ["mvp", "research", "market", "money", "growth", "deck"];
const members = [
  { id: 1, name: "Лід" },
  { id: 2, name: "Аліна" },
  { id: 3, name: "Богдан" },
  { id: 4, name: "Віра" },
  { id: 5, name: "Галя" },
  { id: 6, name: "Дмитро" },
];

function checkInvariants(input: MatchInput) {
  const r = suggestRoles(input);
  expect(r.owners.mvp).toBe(input.leadId);
  const owners = DIRS.map((d) => r.owners[d]);
  expect(new Set(owners).size).toBe(6);
  const reviewers = DIRS.map((d) => r.reviewers[d]);
  expect(reviewers.every((x) => x != null)).toBe(true);
  expect(new Set(reviewers).size).toBe(6); // each member reviews exactly one
  for (const d of DIRS) expect(r.reviewers[d]).not.toBe(r.owners[d]);
  return r;
}

describe("suggestRoles", () => {
  it("assigns each person their favourite direction in the normal case", () => {
    const fav: Record<number, string> = { 2: "research", 3: "market", 4: "money", 5: "growth", 6: "deck" };
    const scores: MatchInput["scores"] = {};
    for (const m of members) {
      scores[m.id] = {};
      for (const d of DIRS) scores[m.id][d] = fav[m.id] === d ? 10 : 3;
    }
    scores[2].mvp = 8; // Аліна is the best second choice for mvp review
    const r = checkInvariants({ members, scores, leadId: 1, directions: DIRS });
    expect(r.owners).toMatchObject({ research: 2, market: 3, money: 4, growth: 5, deck: 6 });
    expect(r.reviewers.deck).toBe(1);
    expect(r.reviewers.mvp).toBe(2);
    const alina = r.perPerson.find((p) => p.memberId === 2)!;
    expect(alina.total).toBe(18);
  });

  it("handles missing scores (nobody filled the form)", () => {
    const r = checkInvariants({ members, scores: {}, leadId: 1, directions: DIRS });
    expect(r.perPerson.every((p) => p.total === 0)).toBe(true);
  });

  it("handles partially missing scores", () => {
    const scores: MatchInput["scores"] = { 3: { growth: 9 } };
    const r = checkInvariants({ members, scores, leadId: 1, directions: DIRS });
    expect(r.owners.growth).toBe(3);
  });

  it("breaks ties by the higher minimum score, then alphabetically", () => {
    // Both of these give total 12 for market+money; the 6+6 split wins over 10+2.
    const scores: MatchInput["scores"] = {
      2: { market: 10, money: 6 },
      3: { market: 6, money: 2 },
    };
    const sub = { members: members.slice(0, 3), scores, leadId: 1, directions: ["mvp", "market", "money"] };
    const r = suggestRoles(sub);
    expect(r.owners.market).toBe(3);
    expect(r.owners.money).toBe(2);

    // Full tie: alphabetical order of names in direction order wins.
    const tie = suggestRoles({ members, scores: {}, leadId: 1, directions: DIRS });
    expect(tie.owners.research).toBe(2); // "Аліна" first alphabetically
    expect(tie.owners.market).toBe(3);
  });
});
