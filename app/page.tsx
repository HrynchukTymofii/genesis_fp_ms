import Link from "next/link";
import { asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { meetings, phases, reports, resources } from "@/db/schema";
import { addDaysStr, daysToPitch, fmtDateTime, fmtDay, fmtDayLong, kyivToday, nowMs, relTime } from "@/lib/dates";
import { REPORT_STATUS_COLOR, REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/labels";
import { currentPhase } from "@/lib/phase";
import { getDirections, getMembers } from "@/lib/queries";
import { getReportSlots } from "@/lib/reports";
import { currentSlot } from "@/lib/reportSlots";
import { getCurrentMember } from "@/lib/session";
import { byDue, getCardTasks } from "@/lib/tasks";
import { plural, shortName } from "@/lib/names";
import { AutoRefresh } from "@/components/AutoRefresh";
import { HomeKanban } from "@/components/Kanban";
import { Favicon } from "@/components/LinkList";
import { JoinCall } from "@/components/JoinCall";
import { Dot, Empty, Tag } from "@/components/Tag";

export default async function HomePage() {
  const today = kyivToday();
  const now = new Date(nowMs());
  const [me, members, dirs, tasks, phaseRows, slotReports, recentReports, nextMeetings, productLinks, slots] =
    await Promise.all([
      getCurrentMember(),
      getMembers(),
      getDirections(),
      getCardTasks(),
      db.select().from(phases),
      db.select({ memberId: reports.memberId, meetingId: reports.meetingId, status: reports.status }).from(reports),
      db.select().from(reports).where(gte(reports.date, addDaysStr(today, -14))).orderBy(desc(reports.date)),
      db.select().from(meetings).where(gte(meetings.startsAt, new Date(nowMs() - 30 * 60_000))).orderBy(asc(meetings.startsAt)).limit(1),
      db.select().from(resources).where(eq(resources.category, "product")).orderBy(asc(resources.sortOrder)),
      getReportSlots(),
    ]);

  const phase = currentPhase(phaseRows, today);
  const days = daysToPitch(today);
  const slot = currentSlot(slots, now);
  const reportedBy = new Map(slotReports.filter((r) => r.meetingId === slot?.meetingId).map((r) => [r.memberId, r]));
  const myFilled = new Set(slotReports.filter((r) => r.memberId === me?.id).map((r) => r.meetingId));
  const myOverdue = slots.filter((s) => s.dueAt <= now && !myFilled.has(s.meetingId)).length;
  const latestReportOf = (memberId: number | null) => recentReports.find((r) => r.memberId === memberId);
  const memberName = (id: number | null) => members.find((m) => m.id === id)?.name ?? null;
  const nextMeeting = nextMeetings[0];
  const filledProduct = productLinks.filter((r) => r.url);

  return (
    <div className="flex flex-col gap-10">
      <AutoRefresh />
      <header>
        <h1 className="page-title">Головна</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-text2">
          <span className="capitalize">{fmtDayLong(today)}</span>
          {phase && (
            <>
              <span className="text-text3">·</span>
              <span>
                Фаза <span className="text-text">{phase.name}</span>
              </span>
              {phase.gate && phase.gate !== "—" && (
                <>
                  <span className="text-text3">·</span>
                  <span>Контрольна точка: {phase.gate}</span>
                </>
              )}
            </>
          )}
          <span className="text-text3">·</span>
          <span className="font-medium text-text">
            {days === 0 ? "Пітч сьогодні о 18:00" : `${days} ${plural(days, "день", "дні", "днів")} до пітчу`}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-text3">Продукт:</span>
          {filledProduct.length === 0 ? (
            <Link href="/resources" className="link">
              Додайте посилання на презентацію та MVP у «Ресурсах»
            </Link>
          ) : (
            filledProduct.map((r) => (
              <a key={r.id} href={r.url!} target="_blank" rel="noreferrer" className="pill">
                <Favicon url={r.url!} size={14} />
                {r.title}
              </a>
            ))
          )}
          {filledProduct.length > 0 && (
            <Link href="/resources" className="pill">
              📚 Усі ресурси
            </Link>
          )}
        </div>
      </header>

      <section aria-labelledby="moving">
        <h2 id="moving" className="section-title mb-3">
          Що рухається
        </h2>
        <HomeKanban tasks={tasks} today={today} weekAgo={new Date(nowMs() - 7 * 864e5).toISOString()} />
      </section>

      <section aria-labelledby="reports-next">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="reports-next" className="section-title">
            {slot ? <span className="capitalize">Звіти до синку · {fmtDateTime(slot.startsAt)}</span> : "Звіти"}
          </h2>
          {slot && (
            <span className={`text-sm ${slot.dueAt <= now ? "text-danger" : "text-text2"}`}>
              Дедлайн {relTime(slot.dueAt)}
            </span>
          )}
          <Link href="/reports" className="link text-sm">
            {me && slot && !myFilled.has(slot.meetingId) ? "Здати мій звіт" : "Усі звіти"}
          </Link>
        </div>
        {myOverdue > 0 && (
          <p className="mb-2 text-danger">
            ⚠️ У вас {myOverdue} {plural(myOverdue, "незданий звіт", "нездані звіти", "незданих звітів")}.{" "}
            <Link href="/reports" className="underline">
              Здати
            </Link>
          </p>
        )}
        {slot ? (
          <ul className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const r = reportedBy.get(m.id);
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
        ) : (
          <Empty>Наступних синків немає.</Empty>
        )}
      </section>

      <section aria-labelledby="dirs">
        <h2 id="dirs" className="section-title mb-2">
          Напрями коротко
        </h2>
        <div className="border-t border-border">
          {dirs.map((d) => {
            const own = tasks.filter((t) => t.directionSlug === d.slug);
            const doneN = own.filter((t) => t.status === "done").length;
            const nextTask = own.filter((t) => t.status !== "done").sort(byDue)[0];
            const rep = latestReportOf(d.ownerId);
            return (
              <Link
                key={d.slug}
                href={`/directions/${d.slug}`}
                className="row-hover grid grid-cols-1 gap-x-4 gap-y-1 border-b border-border px-2 py-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_70px_minmax(0,1.6fr)_110px] sm:items-center"
              >
                <span className="flex items-center gap-2 font-medium">
                  <span aria-hidden>{d.emoji}</span>
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="truncate text-text2">
                  {shortName(memberName(d.ownerId))} → {shortName(memberName(d.reviewerId))}
                </span>
                <span className="text-text2">
                  {doneN} / {own.length}
                </span>
                <span className="truncate text-text2">
                  {nextTask ? (
                    <>
                      {nextTask.title}
                      {nextTask.dueDate && (
                        <span className={nextTask.dueDate < today ? "text-danger" : "text-text3"}>
                          {" "}
                          · {fmtDay(nextTask.dueDate)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-text3">Відкритих задач немає</span>
                  )}
                </span>
                <span>
                  {rep ? (
                    <Tag color={REPORT_STATUS_COLOR[rep.status as ReportStatus]}>
                      {REPORT_STATUS_LABEL[rep.status as ReportStatus]}
                    </Tag>
                  ) : (
                    <span className="text-xs text-text3">без звіту</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="next-meeting">
        <h2 id="next-meeting" className="section-title mb-2">
          Наступна зустріч
        </h2>
        {nextMeeting ? (
          <div className="card px-4 py-3">
            <Link href={`/meetings?m=${nextMeeting.id}`} className="block hover:underline">
              <span className="font-medium">{nextMeeting.title}</span>
            </Link>
            <div className="capitalize text-text2">
              {fmtDateTime(nextMeeting.startsAt)} · {nextMeeting.durationMin} хв
            </div>
            {nextMeeting.agenda && (
              <p className="mt-1 line-clamp-3 whitespace-pre-line text-text2">{nextMeeting.agenda}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <JoinCall url={nextMeeting.meetUrl} />
              <Link href={`/meetings?m=${nextMeeting.id}`} className="link text-sm">
                {nextMeeting.meetUrl ? "Порядок денний і нотатки" : "Додати посилання на Meet"}
              </Link>
            </div>
          </div>
        ) : (
          <Empty>Запланованих зустрічей немає.</Empty>
        )}
      </section>
    </div>
  );
}
