import type { Phase } from "@/db/schema";

/** Phase that contains `today`; before/after the sprint, the first/last one. */
export function currentPhase(phases: Phase[], today: string): Phase | null {
  if (phases.length === 0) return null;
  const sorted = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    sorted.find((p) => p.startDate <= today && today <= p.endDate) ??
    (today < sorted[0].startDate ? sorted[0] : sorted[sorted.length - 1])
  );
}
