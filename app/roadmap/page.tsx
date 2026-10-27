import Link from "next/link";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { meetings, phases } from "@/db/schema";
import { fmtDay, fmtTime, kyivDateOf, kyivToday, sprintDays } from "@/lib/dates";
import { currentPhase } from "@/lib/phase";
import { getCardTasks } from "@/lib/tasks";
import { Tag } from "@/components/Tag";

export const metadata: Metadata = { title: "Roadmap" };

const PHASE_COLORS = ["gray", "green", "blue", "orange", "purple", "red"];
const COL = 44; // px per day
const MARKER: Record<string, string> = { sync: "blue", lock: "yellow", gate: "yellow", pitch: "red", other: "gray" };

export default async function RoadmapPage() {
  const today = kyivToday();
  const days = sprintDays();
  const [phaseRows, meetingRows, tasks] = await Promise.all([
    db.select().from(phases).orderBy(asc(phases.sortOrder)),
    db.select().from(meetings).orderBy(asc(meetings.startsAt)),
    getCardTasks(),
  ]);
  const current = currentPhase(phaseRows, today);
  const idx = (day: string) => days.indexOf(day);
  const todayIdx = idx(today);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="page-title">Roadmap</h1>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} aria-label="Таймлайн спринту">
        <div className="relative" style={{ width: days.length * COL, minWidth: "100%" }}>
          {/* Day header */}
          <div className="flex border-b border-border">
            {days.map((d) => {
              const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
              return (
                <div
                  key={d}
                  className={`shrink-0 py-1 text-center text-xs ${d === today ? "font-semibold text-accent" : dow === 0 || dow === 6 ? "text-text3" : "text-text2"}`}
                  style={{ width: COL }}
                >
                  {fmtDay(d).replace(".", "")}
                </div>
              );
            })}
          </div>

          {/* Phase bars */}
          <div className="relative flex flex-col gap-1.5 py-3">
            {phaseRows.map((p, i) => {
              const start = Math.max(0, idx(p.startDate));
              const end = idx(p.endDate) === -1 ? days.length - 1 : idx(p.endDate);
              return (
                <div key={p.id} className="relative h-7">
                  <div
                    className={`tag tag-${PHASE_COLORS[i % PHASE_COLORS.length]} absolute inset-y-0 h-7 px-2 text-[13px] ${p.id === current?.id ? "font-semibold" : ""}`}
                    style={{ left: start * COL + 2, width: (end - start + 1) * COL - 4 }}
                    title={`${p.name}: ${p.goal}`}
                  >
                    {p.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meetings and gates */}
          <div className="relative h-16 border-t border-border">
            {meetingRows.map((m, i) => {
              const d = idx(kyivDateOf(m.startsAt));
              if (d === -1) return null;
              return (
                <Link
                  key={m.id}
                  href={`/meetings?m=${m.id}`}
                  title={`${m.title}, ${fmtTime(m.startsAt)}`}
                  className="absolute flex flex-col items-center"
                  style={{ left: d * COL + COL / 2 - 6, top: 6 + (i % 2) * 22 }}
                >
                  <span className={`block size-3 rotate-45 rounded-[2px] border border-bg dot-${MARKER[m.kind] ?? "gray"}`} />
                </Link>
              );
            })}
          </div>

          {/* Today line */}
          {todayIdx >= 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-[var(--tag-red)]"
              style={{ left: todayIdx * COL + COL / 2 - 1 }}
            >
              <span className="absolute -top-0 left-1 rounded bg-[var(--tag-red)] px-1 text-[10px] leading-4 text-white">Сьогодні</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-text2">
        <span className="flex items-center gap-1.5"><span className="block size-2.5 rotate-45 dot-blue" /> синк</span>
        <span className="flex items-center gap-1.5"><span className="block size-2.5 rotate-45 dot-yellow" /> контрольна точка / фіксація</span>
        <span className="flex items-center gap-1.5"><span className="block size-2.5 rotate-45 dot-red" /> пітч</span>
        <span className="flex items-center gap-1.5"><span className="block size-2.5 rotate-45 dot-gray" /> інше</span>
      </div>

      <section aria-labelledby="phases">
        <h2 id="phases" className="section-title mb-2">
          Фази
        </h2>
        <div className="border-t border-border">
          {phaseRows.map((p) => {
            const inPhase = tasks.filter((t) => t.dueDate && t.dueDate >= p.startDate && t.dueDate <= p.endDate);
            const done = inPhase.filter((t) => t.status === "done").length;
            const isCurrent = p.id === current?.id;
            return (
              <div
                key={p.id}
                className={`grid grid-cols-1 gap-x-4 gap-y-1 border-b border-border px-3 py-3 sm:grid-cols-[180px_minmax(0,1fr)_90px] ${isCurrent ? "bg-[var(--tag-blue-bg)]" : ""}`}
              >
                <div>
                  <div className="font-medium">
                    {p.name} {isCurrent && <Tag color="blue">зараз</Tag>}
                  </div>
                  <div className="text-text2">
                    {p.startDate === p.endDate ? fmtDay(p.startDate) : `${fmtDay(p.startDate)} – ${fmtDay(p.endDate)}`}
                  </div>
                </div>
                <div>
                  <div>{p.goal}</div>
                  {p.gate && p.gate !== "—" && <div className="mt-0.5 text-text2">🚩 {p.gate}</div>}
                </div>
                <div className="text-text2 sm:text-right">
                  {done} / {inPhase.length} задач
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
