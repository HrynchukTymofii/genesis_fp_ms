import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { directions, reports, resources } from "@/db/schema";
import { fmtDay, fmtDayLong, kyivToday } from "@/lib/dates";
import {
  REPORT_STATUS_COLOR,
  REPORT_STATUS_LABEL,
  TASK_STATUSES,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  type ReportStatus,
} from "@/lib/labels";
import { getMembers } from "@/lib/queries";
import { byDue, getCardTasks } from "@/lib/tasks";
import { DirectionNotes, DirectionRoles, InlineAddTask } from "@/components/DirectionClient";
import { Favicon } from "@/components/LinkList";
import { OpenTaskButton } from "@/components/NewTaskButton";
import { ReportBody } from "@/components/ReportBody";
import { Empty, Tag } from "@/components/Tag";

export async function generateMetadata({ params }: PageProps<"/directions/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [d] = await db.select().from(directions).where(eq(directions.slug, slug));
  return { title: d ? d.name : "Напрям" };
}

export default async function DirectionPage({ params }: PageProps<"/directions/[slug]">) {
  const { slug } = await params;
  const [dir] = await db.select().from(directions).where(eq(directions.slug, slug));
  if (!dir) notFound();
  const today = kyivToday();
  const [allTasks, members, ownerReports, dirResources] = await Promise.all([
    getCardTasks(),
    getMembers(),
    dir.ownerId
      ? db.select().from(reports).where(eq(reports.memberId, dir.ownerId)).orderBy(desc(reports.date)).limit(5)
      : Promise.resolve([]),
    db.select().from(resources).where(eq(resources.directionSlug, slug)).orderBy(asc(resources.sortOrder)),
  ]);
  const tasks = allTasks.filter((t) => t.directionSlug === slug);
  const memberName = (id: number | null) => members.find((m) => m.id === id)?.name ?? "—";
  const deliverables = dir.deliverables.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <div className="mb-3 text-5xl" aria-hidden>
          {dir.emoji}
        </div>
        <h1 className="page-title">{dir.name}</h1>
        <p className="mt-3 max-w-[70ch] text-text2">{dir.description}</p>
        <div className="mt-4 flex flex-col">
          <DirectionRoles slug={dir.slug} ownerId={dir.ownerId} reviewerId={dir.reviewerId} />
        </div>
      </header>

      <section aria-labelledby="deliv">
        <h2 id="deliv" className="section-title mb-2">
          Результати
        </h2>
        <ul className="ml-5 list-disc space-y-0.5">
          {deliverables.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tasks">
        <div className="mb-2 flex items-baseline gap-3">
          <h2 id="tasks" className="section-title">
            Задачі
          </h2>
          <Link href={`/board?dir=${slug}`} className="link text-sm">
            Відкрити на дошці
          </Link>
        </div>
        <div className="border-t border-border">
          {TASK_STATUSES.map((s) => {
            const group = tasks.filter((t) => t.status === s).sort(byDue);
            if (group.length === 0) return null;
            return (
              <div key={s}>
                <div className="flex items-center gap-2 border-b border-border px-2 pb-1 pt-4">
                  <Tag color={TASK_STATUS_COLOR[s]}>{TASK_STATUS_LABEL[s]}</Tag>
                  <span className="text-text3">{group.length}</span>
                </div>
                {group.map((t) => {
                  const overdue = t.status !== "done" && t.dueDate != null && t.dueDate < today;
                  return (
                    <OpenTaskButton
                      key={t.id}
                      id={t.id}
                      className={`row-hover grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border px-2 py-1.5 text-left sm:grid-cols-[22px_minmax(0,1fr)_160px_90px] ${
                        overdue ? "row-overdue" : ""
                      }`}
                    >
                      <span
                        aria-label={TASK_STATUS_LABEL[t.status]}
                        className={`inline-flex size-4 items-center justify-center rounded-[3px] border text-[10px] ${
                          t.status === "done"
                            ? "border-accent bg-accent text-white"
                            : t.status === "todo"
                              ? "border-text3"
                              : "border-accent"
                        }`}
                      >
                        {t.status === "done" ? "✓" : t.status === "todo" ? "" : "•"}
                      </span>
                      <span className={`truncate ${t.status === "done" ? "text-text2 line-through" : ""}`}>
                        {t.title}
                        {t.linkCount > 0 && <span className="ml-2 text-xs text-text3">🔗 {t.linkCount}</span>}
                      </span>
                      <span className="hidden truncate text-text2 sm:block">{memberName(t.ownerId)}</span>
                      <span className={`text-right text-sm ${overdue ? "font-medium text-danger" : "text-text2"}`}>
                        {t.dueDate ? fmtDay(t.dueDate) : "—"}
                      </span>
                    </OpenTaskButton>
                  );
                })}
              </div>
            );
          })}
          <InlineAddTask slug={slug} />
        </div>
      </section>

      {dirResources.length > 0 && (
        <section aria-labelledby="res">
          <div className="mb-2 flex items-baseline gap-3">
            <h2 id="res" className="section-title">
              Ресурси
            </h2>
            <Link href="/resources" className="link text-sm">
              Усі ресурси
            </Link>
          </div>
          <ul className="flex flex-col">
            {dirResources.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-1">
                {r.url ? <Favicon url={r.url} /> : <span aria-hidden className="w-4 text-center text-text3">○</span>}
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="link truncate">
                    {r.title}
                  </a>
                ) : (
                  <span className="truncate text-text2">
                    {r.title} <span className="text-text3">— посилання ще немає</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="notes">
        <h2 id="notes" className="section-title mb-8">
          Нотатки
        </h2>
        <DirectionNotes slug={slug} notes={dir.notes} />
      </section>

      <section aria-labelledby="owner-reports">
        <h2 id="owner-reports" className="section-title mb-2">
          Останні звіти власника
        </h2>
        {ownerReports.length === 0 ? (
          <Empty>{dir.ownerId ? "Власник ще не писав звітів." : "Власника ще не призначено."}</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {ownerReports.map((r) => (
              <li key={r.id} className="card px-3 py-2">
                <div className="mb-1 flex items-center gap-2 text-text2">
                  <span className="capitalize">До синку · {fmtDayLong(r.date)}</span>
                  <Tag color={REPORT_STATUS_COLOR[r.status as ReportStatus]}>
                    {REPORT_STATUS_LABEL[r.status as ReportStatus]}
                  </Tag>
                </div>
                <ReportBody done={r.done} next={r.next} blockers={r.blockers} links={r.links} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
