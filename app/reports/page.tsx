import Link from "next/link";
import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { fmtDayLong, fmtTime, kyivToday } from "@/lib/dates";
import { REPORT_STATUS_COLOR, REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/labels";
import { getMembers } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ReportBody } from "@/components/ReportBody";
import { ReportForm } from "@/components/ReportForm";
import { Empty, Tag } from "@/components/Tag";

export const metadata: Metadata = { title: "Звіти" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { person } = (await searchParams) as { person?: string };
  const personId = person ? Number(person) : null;
  const today = kyivToday();
  const me = (await getCurrentMember())!;
  const [members, mine, todays, feed] = await Promise.all([
    getMembers(),
    db.select().from(reports).where(and(eq(reports.memberId, me.id), eq(reports.date, today))),
    db.select({ memberId: reports.memberId }).from(reports).where(eq(reports.date, today)),
    db
      .select()
      .from(reports)
      .where(personId ? eq(reports.memberId, personId) : undefined)
      .orderBy(desc(reports.date), desc(reports.createdAt))
      .limit(300),
  ]);
  const reported = new Set(todays.map((r) => r.memberId));
  const missing = members.filter((m) => !reported.has(m.id));
  const nameOf = (id: number) => members.find((m) => m.id === id)?.name ?? "—";
  const days = [...new Set(feed.map((r) => r.date))];

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <h1 className="page-title">Звіти</h1>

      <ReportForm existing={mine[0] ?? null} />

      <p className="text-text2">
        {missing.length === 0 ? (
          <span className="text-[var(--tag-green)]">✓ Сьогодні звітували всі.</span>
        ) : (
          <>
            <span className="text-text">Ще без звіту сьогодні:</span> {missing.map((m) => m.name).join(", ")}
          </>
        )}
      </p>

      <section aria-labelledby="feed">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <h2 id="feed" className="section-title mr-2">
            Стрічка
          </h2>
          <Link href="/reports" className="pill" data-active={!personId}>
            Усі
          </Link>
          {members.map((m) => (
            <Link key={m.id} href={`/reports?person=${m.id}`} className="pill" data-active={personId === m.id}>
              {m.name}
            </Link>
          ))}
        </div>
        {feed.length === 0 && <Empty>Звітів ще немає. Напишіть перший.</Empty>}
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <div key={day}>
              <h3 className="mb-2 border-b border-border pb-1 font-medium capitalize text-text2">
                {fmtDayLong(day)}
                {day === today && <span className="ml-2 text-text3">сьогодні</span>}
              </h3>
              <ul className="flex flex-col gap-2">
                {feed
                  .filter((r) => r.date === day)
                  .map((r) => (
                    <li key={r.id} className="card px-3 py-2.5">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{nameOf(r.memberId)}</span>
                        <Tag color={REPORT_STATUS_COLOR[r.status as ReportStatus]}>
                          {REPORT_STATUS_LABEL[r.status as ReportStatus]}
                        </Tag>
                        <span className="text-xs text-text3">{fmtTime(r.createdAt)}</span>
                      </div>
                      <ReportBody done={r.done} next={r.next} blockers={r.blockers} />
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
