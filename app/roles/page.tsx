import type { Metadata } from "next";
import { db } from "@/db";
import { formResponses } from "@/db/schema";
import { PRESENT_OPTIONS } from "@/lib/labels";
import { getDirections, getMembers } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { computeSuggestion } from "@/lib/suggestion";

export const metadata: Metadata = { title: "Ролі" };

type Role = { owns?: string; helps?: string };

/** Who owns and who helps in each direction, by first name and direction slug. */
const ROLE_MATRIX: { name: string; roles: Record<string, Role> }[] = [
  {
    name: "Тимофій",
    roles: {
      mvp: { owns: "стек, AI-функція, деплой, демо" },
      market: { helps: "дані Sensor Tower, розрахунок шляху до $500k/міс" },
      deck: { helps: "перевірка сюжету, частина з демо" },
    },
  },
  {
    name: "Андрій",
    roles: {
      mvp: { helps: "UI у Figma, лендинг" },
      growth: { helps: "статичні креативи" },
      deck: { owns: "шаблон, дизайн, збірка PPTX" },
    },
  },
  {
    name: "Гліб",
    roles: {
      market: { helps: "розмір ринку (вже зроблено), аналіз конкурентів" },
      money: { helps: "аналіз цін і пейволів конкурентів" },
      growth: { owns: "канали трафіку, воронка, реклама, рекламний тест" },
    },
  },
  {
    name: "Аліна",
    roles: {
      mvp: { helps: "тестування, аналітичні події" },
      research: { helps: "пошук респондентів зі США" },
      money: { owns: "таблиця з цифрами, припущення воронки, LTV/CAC" },
    },
  },
  {
    name: "Катерина",
    roles: {
      research: { helps: "інтерв’ю, перевірка висновків" },
      market: { owns: "TAM/SAM/SOM, позиціонування" },
      money: { helps: "модель ціноутворення, перевірка LTV/CAC" },
    },
  },
  {
    name: "Олександра",
    roles: {
      research: { owns: "сценарій, інтерв’ю зі США, висновки, юзабіліті-тести" },
      growth: { helps: "тексти лендингу та квізу" },
      deck: { helps: "сюжет і репетиції" },
    },
  },
];

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
  const dirs = await getDirections();

  return (
    <div className="flex flex-col gap-10">
      <h1 className="page-title">Ролі</h1>

      <section aria-labelledby="matrix">
        <h2 id="matrix" className="section-title mb-1">
          Хто за що відповідає
        </h2>
        <p className="mb-3 text-text2">
          <span className="rounded bg-[var(--tag-purple-bg)] px-1 font-medium">Відповідає</span> — власник напряму;
          «Допомагає» — підтримує власника.
        </p>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text2">
                <th className="w-[120px] px-2 py-2 font-normal"></th>
                {dirs.map((d) => (
                  <th key={d.slug} className="px-2 py-2 font-medium text-text">
                    {d.emoji} {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.name} className="border-b border-border">
                  <th scope="row" className="px-2 py-2 font-medium">
                    {row.name}
                  </th>
                  {dirs.map((d) => {
                    const r = row.roles[d.slug];
                    if (r?.owns)
                      return (
                        <td key={d.slug} className="bg-[var(--tag-purple-bg)] px-2 py-2 align-top font-medium">
                          Відповідає: {r.owns}
                        </td>
                      );
                    if (r?.helps)
                      return (
                        <td key={d.slug} className="px-2 py-2 align-top text-text2">
                          Допомагає: {r.helps}
                        </td>
                      );
                    return (
                      <td key={d.slug} className="px-2 py-2 text-center text-text3">
                        —
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {me.isLead && <VotesGrid dirs={dirs} />}
    </div>
  );
}

/** Lead only: how everyone rated each direction in the team form, collapsed by default. */
async function VotesGrid({ dirs }: { dirs: Awaited<ReturnType<typeof getDirections>> }) {
  const [members, responses, { scores }] = await Promise.all([
    getMembers(),
    db.select().from(formResponses),
    computeSuggestion(),
  ]);
  const respOf = (id: number) => responses.find((r) => r.memberId === id);
  const presentLabel = (v: string | null | undefined) => PRESENT_OPTIONS.find((o) => o.value === v)?.label ?? "—";

  return (
    <details>
      <summary className="section-title cursor-pointer select-none">Як голосували в анкеті</summary>
      <div className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
                  <td className="px-2 py-1.5">{m.name}</td>
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
    </details>
  );
}
