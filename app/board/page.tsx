import Link from "next/link";
import type { Metadata } from "next";
import { kyivToday, weekRange } from "@/lib/dates";
import { getDirections, getMembers } from "@/lib/queries";
import { getCardTasks } from "@/lib/tasks";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Board } from "@/components/Kanban";
import { NewTaskButton } from "@/components/NewTaskButton";

export const metadata: Metadata = { title: "Дошка" };

type Filters = { dir?: string; person?: string; week?: string; overdue?: string; due?: string };

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  const sp = (await searchParams) as Filters;
  const today = kyivToday();
  const [weekStart, weekEnd] = weekRange(today);
  const [tasks, dirs, members] = await Promise.all([getCardTasks(), getDirections(), getMembers()]);
  const personId = sp.person ? Number(sp.person) : null;

  const filtered = tasks.filter(
    (t) =>
      (!sp.dir || t.directionSlug === sp.dir) &&
      (!personId || t.ownerId === personId || t.reviewerId === personId) &&
      (!sp.week || (t.dueDate != null && t.dueDate >= weekStart && t.dueDate <= weekEnd)) &&
      (!sp.overdue || (t.status !== "done" && t.dueDate != null && t.dueDate < today)) &&
      (!sp.due || (t.status !== "done" && t.dueDate != null)),
  );

  const href = (patch: Partial<Filters>) => {
    const next = { ...sp, ...patch };
    const q = new URLSearchParams(
      Object.entries(next).filter((e): e is [string, string] => typeof e[1] === "string" && e[1] !== ""),
    ).toString();
    return q ? `/board?${q}` : "/board";
  };
  const anyFilter = Boolean(sp.dir || sp.person || sp.week || sp.overdue || sp.due);

  return (
    <div>
      <AutoRefresh />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Дошка</h1>
        <NewTaskButton defaults={sp.dir ? { directionSlug: sp.dir } : {}} />
      </div>

      <div className="mb-5 flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Фільтр за напрямом">
          <Link href={href({ dir: "" })} className="pill" data-active={!sp.dir}>
            Усі напрями
          </Link>
          {dirs.map((d) => (
            <Link key={d.slug} href={href({ dir: sp.dir === d.slug ? "" : d.slug })} className="pill" data-active={sp.dir === d.slug}>
              {d.emoji} {d.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Фільтр за людиною та датою">
          {members.map((m) => (
            <Link
              key={m.id}
              href={href({ person: personId === m.id ? "" : String(m.id) })}
              className="pill"
              data-active={personId === m.id}
            >
              👤 {m.name}
            </Link>
          ))}
          <Link href={href({ week: sp.week ? "" : "1" })} className="pill" data-active={Boolean(sp.week)}>
            📅 Цього тижня
          </Link>
          <Link href={href({ overdue: sp.overdue ? "" : "1" })} className="pill" data-active={Boolean(sp.overdue)}>
            ⏰ Прострочені
          </Link>
          <Link href={href({ due: sp.due ? "" : "1" })} className="pill" data-active={Boolean(sp.due)}>
            З дедлайном
          </Link>
          {anyFilter && (
            <Link href="/board" className="pill text-text3">
              ✕ Скинути
            </Link>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text3">Під ці фільтри задач немає. Змініть фільтри або створіть нову задачу.</p>
      ) : (
        <Board tasks={filtered} today={today} />
      )}
    </div>
  );
}
