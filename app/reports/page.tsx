import Link from "next/link";
import type { Metadata } from "next";
import { asc, desc, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { reports, resources } from "@/db/schema";
import { fmtDateTime, fmtDayLong, nowMs, relTime } from "@/lib/dates";
import { REPORT_STATUS_COLOR, REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/labels";
import { getMembers } from "@/lib/queries";
import { getReportSlots } from "@/lib/reports";
import { defaultSlot, slotsToShow, type ReportSlot } from "@/lib/reportSlots";
import { getCurrentMember } from "@/lib/session";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ReportBody } from "@/components/ReportBody";
import { ReportForm } from "@/components/ReportForm";
import { Dot, Empty, Tag } from "@/components/Tag";

export const metadata: Metadata = { title: "Звіти" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { person, slot } = (await searchParams) as { person?: string; slot?: string };
  const personId = person ? Number(person) : null;
  const me = (await getCurrentMember())!;
  const now = new Date(nowMs());
  const [members, slots, all, resourceRows] = await Promise.all([
    getMembers(),
    getReportSlots(),
    db.select().from(reports).orderBy(desc(reports.date), desc(reports.updatedAt)),
    db
      .select({ id: resources.id, title: resources.title, url: resources.url })
      .from(resources)
      .where(isNotNull(resources.url))
      .orderBy(asc(resources.sortOrder)),
  ]);

  const mine = all.filter((r) => r.memberId === me.id);
  const filled = new Set(mine.map((r) => r.meetingId).filter((id): id is number => id != null));
  const visible = slotsToShow(slots, filled, now);
  const selected =
    slots.find((s) => s.meetingId === Number(slot)) ?? defaultSlot(slots, filled, now);
  const existing = selected ? mine.find((r) => r.meetingId === selected.meetingId) : undefined;
  const reportsFor = (s: ReportSlot) => all.filter((r) => r.meetingId === s.meetingId);
  const nameOf = (id: number) => members.find((m) => m.id === id)?.name ?? "—";
  const slotHref = (id: number) => `/reports?slot=${id}${personId ? `&person=${personId}` : ""}`;

  const deadlineTag = (s: ReportSlot) => {
    if (filled.has(s.meetingId)) return { text: "✓ Здано", color: "green" };
    if (s.dueAt <= now) return { text: `Прострочено · ${relTime(s.dueAt)}`, color: "red" };
    return { text: `Дедлайн ${relTime(s.dueAt)}`, color: s.dueAt.getTime() - now.getTime() < 864e5 ? "orange" : "blue" };
  };

  const feed = all.filter((r) => !personId || r.memberId === personId);
  const groups = [...new Set(feed.map((r) => r.meetingId ?? r.date))];
  const slotOf = (id: number | string) => slots.find((s) => s.meetingId === id);

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />
      <header>
        <h1 className="page-title">Звіти</h1>
        <p className="mt-2 text-text2">Перед кожним синком кожен здає звіт, не пізніше ніж за 2 години до початку.</p>
      </header>

      <section aria-labelledby="required">
        <h2 id="required" className="section-title mb-2">
          Потрібні звіти
        </h2>
        {visible.length === 0 ? (
          <Empty>Усі звіти здані. Наступні з’являться, коли в «Зустрічах» буде новий синк.</Empty>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded border border-border">
            {visible.map((s) => {
              const tag = deadlineTag(s);
              const count = reportsFor(s).length;
              const active = s.meetingId === selected?.meetingId;
              return (
                <li key={s.meetingId} className="border-b border-border last:border-b-0">
                  <Link
                    href={slotHref(s.meetingId)}
                    aria-current={active || undefined}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_90px_auto] ${active ? "bg-selected" : "row-hover"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium capitalize">
                        <span aria-hidden className="mr-1.5">{filled.has(s.meetingId) ? "✅" : s.dueAt <= now ? "⚠️" : "📝"}</span>
                        Синк · {fmtDateTime(s.startsAt)}
                      </span>
                      <span className="block text-xs capitalize text-text3">Здати до {fmtDateTime(s.dueAt)}</span>
                    </span>
                    <span className="hidden text-sm text-text2 sm:block">
                      {count} / {members.length} здали
                    </span>
                    <span className={`tag tag-${tag.color} justify-self-end`}>{tag.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected && (
        <>
          <ReportForm
            key={selected.meetingId}
            meetingId={selected.meetingId}
            heading={`Звіт до синку · ${fmtDateTime(selected.startsAt)}`}
            deadline={fmtDateTime(selected.dueAt)}
            deadlineTag={deadlineTag(selected)}
            existing={existing ?? null}
            resources={resourceRows.map((r) => ({ id: r.id, title: r.title, url: r.url! }))}
          />

          <section aria-labelledby="team-status">
            <h2 id="team-status" className="mb-2 font-medium text-text2">
              Хто здав до цього синку
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const r = reportsFor(selected).find((x) => x.memberId === m.id);
                const st = r?.status as ReportStatus | undefined;
                return (
                  <li key={m.id}>
                    <span
                      className={`tag h-7 gap-1.5 px-2.5 text-[13px] ${r ? "tag-green" : "tag-gray"}`}
                      title={r ? `Звіт є · ${REPORT_STATUS_LABEL[st!]}` : "Ще без звіту"}
                    >
                      <Dot color={r ? REPORT_STATUS_COLOR[st!] : "gray"} />
                      {m.name}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

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
        {feed.length === 0 && <Empty>Звітів ще немає. Здайте перший.</Empty>}
        <div className="flex flex-col gap-8">
          {groups.map((g) => {
            const s = slotOf(g);
            const rows = feed.filter((r) => (r.meetingId ?? r.date) === g);
            return (
              <div key={String(g)}>
                <h3 className="mb-2 flex items-baseline gap-2 border-b border-border pb-1.5 font-medium text-text2">
                  <span className="capitalize">
                    {s ? `До синку · ${fmtDateTime(s.startsAt)}` : fmtDayLong(rows[0].date)}
                  </span>
                  {s && !personId && (
                    <span className="text-xs text-text3">
                      {rows.length} / {members.length}
                    </span>
                  )}
                </h3>
                <ul className="flex flex-col gap-2">
                  {rows.map((r) => (
                    <li key={r.id} className="card px-4 py-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-medium">{nameOf(r.memberId)}</span>
                        <Tag color={REPORT_STATUS_COLOR[r.status as ReportStatus]}>
                          {REPORT_STATUS_LABEL[r.status as ReportStatus]}
                        </Tag>
                        {s && r.createdAt > s.dueAt && <Tag color="orange">із запізненням</Tag>}
                        <span className="ml-auto text-xs text-text3" title={`Оновлено ${fmtDateTime(r.updatedAt)}`}>
                          {fmtDateTime(r.createdAt)}
                        </span>
                      </div>
                      <ReportBody done={r.done} next={r.next} blockers={r.blockers} links={r.links} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
