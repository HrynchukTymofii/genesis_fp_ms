import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { formResponses, interests } from "@/db/schema";
import { PRESENT_OPTIONS } from "@/lib/labels";
import { getDirections, getMembers } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { computeSuggestion } from "@/lib/suggestion";
import { ApplySuggestionButton, RoleSelect, SwapButton } from "@/components/RolesClient";

export const metadata: Metadata = { title: "Ролі" };

/** 1 = light, 10 = strong, on the blue scale. */
function heat(score: number | undefined) {
  if (!score) return { background: "transparent", color: "var(--text3)" };
  const pct = Math.round(8 + (score / 10) * 72);
  return {
    background: `color-mix(in srgb, var(--tag-blue) ${pct}%, transparent)`,
    color: score >= 6 ? "#fff" : "var(--text)",
  };
}

export default async function RolesPage() {
  const me = (await getCurrentMember())!;
  if (!me.isLead) notFound(); // Roles are visible to the lead only
  const [members, dirs, responses, { result, scores, swapped }, allInterests] = await Promise.all([
    getMembers(),
    getDirections(),
    db.select().from(formResponses),
    computeSuggestion(),
    db.select().from(interests).orderBy(desc(interests.score)),
  ]);
  const mvpHelpers = allInterests.filter((i) => i.directionSlug === "mvp" && i.memberId !== me.id);
  // What people wrote about each direction (the note is required for scores 8–10). MVP has its own section below.
  const notesByDir = dirs
    .filter((d) => d.slug !== "mvp")
    .map((d) => ({ dir: d, notes: allInterests.filter((i) => i.directionSlug === d.slug && i.note?.trim()) }));
  const nameOf = (id: number | null) => members.find((m) => m.id === id)?.name ?? "—";
  const respOf = (id: number) => responses.find((r) => r.memberId === id);
  const presentLabel = (v: string | null | undefined) => PRESENT_OPTIONS.find((o) => o.value === v)?.label ?? "—";

  // Warnings about the current (applied) assignment.
  const warnings: string[] = [];
  const notFilled = members.filter((m) => !respOf(m.id));
  if (notFilled.length) warnings.push(`Ще не заповнили анкету: ${notFilled.map((m) => m.name).join(", ")}.`);
  for (const m of members) {
    if (!dirs.some((d) => d.ownerId === m.id)) warnings.push(`${m.name} не володіє жодним напрямом.`);
    const reviews = dirs.filter((d) => d.reviewerId === m.id);
    if (reviews.length > 1) warnings.push(`${m.name} рецензує більше одного напряму (${reviews.map((d) => d.name).join(", ")}).`);
  }
  for (const m of members) {
    const owns = dirs.filter((d) => result.owners[d.slug] === m.id);
    const reviews = dirs.filter((d) => result.reviewers[d.slug] === m.id);
    if (owns.length > 1) warnings.push(`Пропозиція: ${m.name} — власник кількох напрямів (${owns.map((d) => d.name).join(", ")}).`);
    if (reviews.length > 1) warnings.push(`Пропозиція: ${m.name} рецензує кілька напрямів (${reviews.map((d) => d.name).join(", ")}).`);
  }
  for (const d of dirs) {
    if (d.ownerId && d.ownerId === d.reviewerId) warnings.push(`«${d.name}»: власник і рецензент — одна людина.`);
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="page-title">Ролі</h1>

      <section aria-labelledby="resp">
        <h2 id="resp" className="section-title mb-2">
          Відповіді анкети
        </h2>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-text2">
                <th className="px-2 py-1.5 font-normal">Ім’я</th>
                <th className="px-2 py-1.5 font-normal">Год/тижд</th>
                <th className="px-2 py-1.5 font-normal">Презентує</th>
                {dirs.map((d) => (
                  <th key={d.slug} className="px-1 py-1.5 text-center font-normal" title={d.name}>
                    {d.emoji}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const r = respOf(m.id);
                return (
                  <tr key={m.id} className="border-b border-border">
                    <td className="px-2 py-1.5">
                      {m.name}
                    </td>
                    <td className="px-2 py-1.5 text-text2">{r?.hoursPerWeek ?? (r ? "—" : <span className="text-text3">не заповнено</span>)}</td>
                    <td className="px-2 py-1.5 text-text2">{r ? presentLabel(r.willingToPresent) : ""}</td>
                    {dirs.map((d) => {
                      const s = r ? scores[m.id]?.[d.slug] : undefined;
                      return (
                        <td key={d.slug} className="p-0.5 text-center">
                          <span className="inline-flex size-8 items-center justify-center rounded text-sm" style={heat(s)}>
                            {s ?? "·"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="notes">
        <h2 id="notes" className="section-title mb-1">
          Що кожен вміє в напрямах
        </h2>
        <p className="mb-3 text-text2">З анкети: пояснення до оцінок (обов’язкові для 8–10), від найвищої оцінки.</p>
        <div className="flex flex-col gap-6">
          {notesByDir.map(({ dir, notes }) => (
            <div key={dir.slug}>
              <h3 className="mb-1 font-medium">
                {dir.emoji} {dir.name}
              </h3>
              {notes.length === 0 ? (
                <p className="text-text3">Ніхто нічого не написав.</p>
              ) : (
                <ul className="border-t border-border">
                  {notes.map((i) => (
                    <li key={i.id} className="grid grid-cols-[40px_minmax(0,180px)_minmax(0,1fr)] items-start gap-x-3 border-b border-border px-2 py-2">
                      <span className="inline-flex size-8 items-center justify-center rounded text-sm" style={heat(i.score)}>
                        {i.score}
                      </span>
                      <span className="truncate pt-1">{nameOf(i.memberId)}</span>
                      <span className="whitespace-pre-wrap pt-1 text-text2">{i.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="sugg" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 id="sugg" className="section-title">
              Запропонований розподіл
            </h2>
            <p className="text-text2">
              Порахований з оцінок анкети: «Продукт і MVP» закріплено; кожен рецензує рівно один напрям і ніколи свій.
            </p>
          </div>
          {me.isLead && <ApplySuggestionButton />}
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-text2">
                <th className="px-2 py-1.5 font-normal">Напрям</th>
                <th className="px-2 py-1.5 font-normal">Пропозиція: власник</th>
                <th className="px-2 py-1.5 font-normal">Пропозиція: рецензент</th>
                <th className="px-1 py-1.5 font-normal" aria-label="Поміняти місцями"></th>
                <th className="px-2 py-1.5 font-normal">Зараз: власник</th>
                <th className="px-2 py-1.5 font-normal">Зараз: рецензент</th>
              </tr>
            </thead>
            <tbody>
              {dirs.map((d) => {
                const o = result.owners[d.slug] ?? null;
                const rv = result.reviewers[d.slug] ?? null;
                return (
                  <tr key={d.slug} className="border-b border-border">
                    <td className="px-2 py-1.5">
                      {d.emoji} {d.name}
                    </td>
                    <td className="px-2 py-1.5">
                      {nameOf(o)} <span className="text-text3">({o ? (scores[o]?.[d.slug] ?? 0) : "—"})</span>
                    </td>
                    <td className="px-2 py-1.5">
                      {nameOf(rv)} <span className="text-text3">({rv ? (scores[rv]?.[d.slug] ?? 0) : "—"})</span>
                    </td>
                    <td className="px-1 py-1">
                      <SwapButton slug={d.slug} swapped={swapped.has(d.slug)} />
                    </td>
                    <td className="px-2 py-1">
                      {me.isLead ? <RoleSelect slug={d.slug} field="ownerId" value={d.ownerId} /> : nameOf(d.ownerId)}
                    </td>
                    <td className="px-2 py-1">
                      {me.isLead ? <RoleSelect slug={d.slug} field="reviewerId" value={d.reviewerId} /> : nameOf(d.reviewerId)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-1.5 text-sm text-text2">
          <span>Сума балів на людину:</span>
          {result.perPerson.map((p) => (
            <span key={p.memberId} className="tag tag-gray">
              {p.name}: {p.total}
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="mvp-help">
        <h2 id="mvp-help" className="section-title mb-1">
          🛠 Хто може допомогти з MVP
        </h2>
        <p className="mb-3 text-text2">З анкети: наскільки кожен хоче допомагати з продуктом і чим саме.</p>
        {mvpHelpers.length === 0 ? (
          <p className="text-text3">Ще ніхто не оцінив MVP в анкеті.</p>
        ) : (
          <ul className="border-t border-border">
            {mvpHelpers.map((i) => (
              <li key={i.id} className="grid grid-cols-[40px_minmax(0,180px)_minmax(0,1fr)] items-center gap-x-3 border-b border-border px-2 py-2">
                <span className="inline-flex size-8 items-center justify-center rounded text-sm" style={heat(i.score)}>
                  {i.score}
                </span>
                <span className="truncate">{nameOf(i.memberId)}</span>
                <span className="truncate text-text2">{i.note || <span className="text-text3">—</span>}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {warnings.length > 0 && (
        <section aria-labelledby="warn">
          <h2 id="warn" className="section-title mb-2">
            Попередження
          </h2>
          <ul className="flex flex-col gap-1">
            {warnings.map((w) => (
              <li key={w} className="flex gap-2 text-[var(--tag-orange)]">
                <span aria-hidden>⚠</span>
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
