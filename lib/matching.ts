// Role matching: pure function, see SPEC section 6.

export type MatchMember = { id: number; name: string };
export type MatchInput = {
  members: MatchMember[];
  /** scores[memberId][directionSlug] = 1..10; missing = 0 */
  scores: Record<number, Record<string, number>>;
  leadId: number | null;
  /** All direction slugs in display order; must include "mvp" and "deck". */
  directions: string[];
};
export type MatchResult = {
  owners: Record<string, number | null>;
  reviewers: Record<string, number | null>;
  perPerson: { memberId: number; name: string; owns: string[]; reviews: string[]; total: number }[];
};

const score = (input: MatchInput, memberId: number | null, slug: string) =>
  memberId == null ? 0 : (input.scores[memberId]?.[slug] ?? 0);

type Candidate = { assign: (number | null)[]; total: number; min: number; names: string };

function better(a: Candidate, b: Candidate | null): boolean {
  if (!b) return true;
  if (a.total !== b.total) return a.total > b.total;
  if (a.min !== b.min) return a.min > b.min;
  return a.names.localeCompare(b.names, "uk") < 0;
}

/**
 * Brute-force an injective assignment of `pool` members onto `slugs`
 * respecting `allowed`. Maximizes total, then min score, then alphabetical
 * (names in direction order). Slots stay empty only when people run out.
 */
function bestAssignment(
  input: MatchInput,
  slugs: string[],
  pool: MatchMember[],
  allowed: (slug: string, memberId: number) => boolean,
): (number | null)[] | null {
  const nameOf = new Map(pool.map((m) => [m.id, m.name]));
  const need = Math.min(slugs.length, pool.length);
  let best: Candidate | null = null;
  const used = new Set<number>();
  const cur: (number | null)[] = [];

  const rec = (i: number) => {
    if (i === slugs.length) {
      if (cur.filter((x) => x != null).length < need) return;
      const vals = slugs.map((s, k) => score(input, cur[k], s));
      const cand: Candidate = {
        assign: [...cur],
        total: vals.reduce((a, b) => a + b, 0),
        min: Math.min(...vals),
        names: cur.map((id) => (id == null ? "￿" : nameOf.get(id)!)).join("|"),
      };
      if (better(cand, best)) best = cand;
      return;
    }
    for (const m of pool) {
      if (used.has(m.id) || !allowed(slugs[i], m.id)) continue;
      used.add(m.id);
      cur.push(m.id);
      rec(i + 1);
      cur.pop();
      used.delete(m.id);
    }
    if (pool.length < slugs.length) {
      cur.push(null);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  return best ? (best as Candidate).assign : null;
}

export function suggestRoles(input: MatchInput): MatchResult {
  const owners: Record<string, number | null> = {};
  const reviewers: Record<string, number | null> = {};
  const lead = input.members.find((m) => m.id === input.leadId) ?? null;

  // 1. Owners: mvp -> lead, the rest brute-forced over non-lead members.
  owners.mvp = lead?.id ?? null;
  const ownerSlugs = input.directions.filter((s) => s !== "mvp");
  const ownerPool = input.members.filter((m) => m.id !== lead?.id);
  const ownerAssign = bestAssignment(input, ownerSlugs, ownerPool, () => true) ?? [];
  ownerSlugs.forEach((s, i) => (owners[s] = ownerAssign[i] ?? null));

  // 2. Reviewers: each member reviews one direction, never their own.
  //    Default deck reviewer = lead; fall back to a full search if that fails.
  const notOwner = (slug: string, id: number) => owners[slug] !== id;
  let assigned = false;
  if (lead && notOwner("deck", lead.id)) {
    const rest = input.directions.filter((s) => s !== "deck");
    const pool = input.members.filter((m) => m.id !== lead.id);
    const a = bestAssignment(input, rest, pool, notOwner);
    if (a) {
      reviewers.deck = lead.id;
      rest.forEach((s, i) => (reviewers[s] = a[i] ?? null));
      assigned = true;
    }
  }
  if (!assigned) {
    const a = bestAssignment(input, input.directions, input.members, notOwner) ?? [];
    input.directions.forEach((s, i) => (reviewers[s] = a[i] ?? null));
  }

  // 3. Per-person summary so the lead can sanity-check.
  const perPerson = input.members.map((m) => {
    const owns = input.directions.filter((s) => owners[s] === m.id);
    const reviews = input.directions.filter((s) => reviewers[s] === m.id);
    const total = [...owns, ...reviews].reduce((acc, s) => acc + score(input, m.id, s), 0);
    return { memberId: m.id, name: m.name, owns, reviews, total };
  });

  return { owners, reviewers, perPerson };
}
