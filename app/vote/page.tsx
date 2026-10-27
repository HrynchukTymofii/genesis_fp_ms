import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { niches, votes } from "@/db/schema";
import { VOTE_CRITERIA } from "@/lib/labels";
import { getCurrentMember } from "@/lib/session";
import { NicheActiveToggle, VoteCard } from "@/components/VoteClient";
import { Empty } from "@/components/Tag";

export const metadata: Metadata = { title: "Голосування за ідею" };

export default async function VotePage() {
  const me = (await getCurrentMember())!;
  const [allNiches, allVotes] = await Promise.all([
    db.select().from(niches).orderBy(asc(niches.id)),
    db.select().from(votes),
  ]);
  const active = allNiches.filter((n) => n.active);
  const inactive = allNiches.filter((n) => !n.active);

  const results = active
    .map((n) => {
      const vs = allVotes.filter((v) => v.nicheId === n.id);
      const avg = Object.fromEntries(
        VOTE_CRITERIA.map((c) => [c.key, vs.length ? vs.reduce((a, v) => a + v[c.key], 0) / vs.length : 0]),
      ) as Record<(typeof VOTE_CRITERIA)[number]["key"], number>;
      const total = VOTE_CRITERIA.reduce((a, c) => a + avg[c.key], 0);
      return { niche: n, avg, total, voters: vs.length };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="page-title">Голосування за ідею</h1>
        <p className="mt-2 text-text2">Оцініть кожну нішу від 1 до 5 за п’ятьма критеріями. Результати — внизу.</p>
      </div>

      {active.length === 0 && <Empty>Активних ніш немає.</Empty>}
      {active.map((n) => {
        const mine = allVotes.find((v) => v.nicheId === n.id && v.memberId === me.id);
        return (
          <section key={n.id} aria-labelledby={`n${n.id}`} className="flex flex-col gap-3 border-b border-border pb-8">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id={`n${n.id}`} className="section-title">
                  {n.name}
                </h2>
                <p className="mt-0.5">{n.summary}</p>
                <p className="mt-0.5 text-text2">📈 {n.dataNote}</p>
              </div>
              {me.isLead && <NicheActiveToggle id={n.id} active />}
            </div>
            <VoteCard
              nicheId={n.id}
              initial={
                mine
                  ? { pain: mine.pain, reach: mine.reach, buildable: mine.buildable, money: mine.money, growth: mine.growth }
                  : null
              }
            />
          </section>
        );
      })}

      <section aria-labelledby="results">
        <h2 id="results" className="section-title mb-2">
          Результати
        </h2>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border text-text2">
                <th className="px-2 py-1.5 font-normal">Ніша</th>
                {VOTE_CRITERIA.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 text-right font-normal" title={c.label}>
                    {c.short}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right font-medium text-text">Разом</th>
                <th className="px-2 py-1.5 text-right font-normal">Голосів</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.niche.id} className="border-b border-border">
                  <td className="px-2 py-1.5">
                    {i === 0 && r.voters > 0 && <span aria-label="лідер">🏆 </span>}
                    {r.niche.name}
                  </td>
                  {VOTE_CRITERIA.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 text-right tabular-nums text-text2">
                      {r.voters ? r.avg[c.key].toFixed(1) : "—"}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">{r.voters ? r.total.toFixed(1) : "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text2">{r.voters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {inactive.length > 0 && (
        <section aria-labelledby="inactive">
          <h2 id="inactive" className="section-title mb-2">
            Неактивні ніші
          </h2>
          <ul className="flex flex-col gap-1">
            {inactive.map((n) => (
              <li key={n.id} className="flex items-center gap-2 text-text2">
                <span className="line-through">{n.name}</span>
                {me.isLead && <NicheActiveToggle id={n.id} active={false} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
