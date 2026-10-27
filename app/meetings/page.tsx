import Link from "next/link";
import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { decisions, meetings, type Meeting } from "@/db/schema";
import { fmtDateTime, nowMs, relTime, utcToKyivInput } from "@/lib/dates";
import { MEETING_KIND_COLOR, MEETING_KIND_LABEL } from "@/lib/labels";
import { getMembers } from "@/lib/queries";
import { AddDecision, DeleteDecision, EditableMeetingRow, MeetingNotes, ToggleEditor } from "@/components/MeetingClient";
import { JoinCall } from "@/components/JoinCall";
import { Empty, Tag } from "@/components/Tag";

export const metadata: Metadata = { title: "Зустрічі" };

export default async function MeetingsPage({ searchParams }: PageProps<"/meetings">) {
  const { m } = (await searchParams) as { m?: string };
  const [rows, allDecisions, members] = await Promise.all([
    db.select().from(meetings).orderBy(asc(meetings.startsAt)),
    db.select().from(decisions).orderBy(desc(decisions.createdAt)),
    getMembers(),
  ]);
  const now = nowMs();
  const isPast = (x: Meeting) => x.startsAt.getTime() + x.durationMin * 60_000 < now;
  const upcoming = rows.filter((x) => !isPast(x));
  const past = rows.filter(isPast).reverse();
  const selected = rows.find((x) => String(x.id) === m) ?? null;
  const nameOf = (id: number | null) => members.find((p) => p.id === id)?.name ?? "—";
  const meetingTitle = (id: number | null) => rows.find((x) => x.id === id)?.title;

  const draftOf = (x: Meeting) => ({
    id: x.id,
    title: x.title,
    startsAt: utcToKyivInput(x.startsAt),
    durationMin: x.durationMin,
    agenda: x.agenda,
    kind: x.kind,
    meetUrl: x.meetUrl ?? "",
  });

  const row = (x: Meeting) => (
    <EditableMeetingRow key={x.id} draft={draftOf(x)}>
      <Link
        href={`/meetings?m=${x.id}`}
        aria-current={selected?.id === x.id ? "true" : undefined}
        className={`row-hover grid grid-cols-1 gap-x-4 px-2 py-2.5 sm:grid-cols-[200px_minmax(0,1fr)] ${selected?.id === x.id ? "bg-selected" : ""}`}
      >
        <div className="text-text2">
          <span className="capitalize">{fmtDateTime(x.startsAt)}</span> · {x.durationMin} хв
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            {x.title}
            <Tag color={MEETING_KIND_COLOR[x.kind]}>{MEETING_KIND_LABEL[x.kind]}</Tag>
            {x.meetUrl && <span className="text-xs font-normal text-text3">📹 Meet</span>}
          </div>
          {x.agenda && <div className="truncate text-text2">{x.agenda.split("\n").join(" · ")}</div>}
        </div>
      </Link>
    </EditableMeetingRow>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="page-title">Зустрічі</h1>
        <ToggleEditor label="+ Нова зустріч" />
      </div>

      {selected && (
        <section aria-labelledby="sel" className="flex flex-col gap-5 rounded border border-border p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="sel" className="section-title">
                {selected.title}
              </h2>
              <div className="capitalize text-text2">
                {fmtDateTime(selected.startsAt)} · {selected.durationMin} хв · {MEETING_KIND_LABEL[selected.kind]}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <JoinCall url={selected.meetUrl} />
              <Link href="/meetings" className="btn btn-ghost" scroll={false}>
                ✕ Закрити
              </Link>
            </div>
          </div>
          <ToggleEditor key={selected.id} label="✎ Змінити дату, час або посилання" initial={draftOf(selected)} />
          {!selected.meetUrl && (
            <p className="text-text3">Посилання на Google Meet ще немає — додайте його через «Змінити».</p>
          )}
          {selected.agenda && (
            <div>
              <h3 className="mb-1 font-medium text-text2">Порядок денний</h3>
              <ol className="ml-5 list-decimal space-y-0.5">
                {selected.agenda.split("\n").filter(Boolean).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
          )}
          <div>
            <h3 className="mb-7 font-medium text-text2">Нотатки</h3>
            <MeetingNotes id={selected.id} notes={selected.notes} />
          </div>
          <div>
            <h3 className="mb-2 font-medium text-text2">Рішення</h3>
            <ul className="mb-2 flex flex-col">
              {allDecisions
                .filter((d) => d.meetingId === selected.id)
                .map((d) => (
                  <li key={d.id} className="group flex items-start gap-2 py-1">
                    <span aria-hidden className="text-[var(--tag-green)]">✓</span>
                    <span className="flex-1">{d.text}</span>
                    <span className="text-xs text-text3">{nameOf(d.createdBy)}</span>
                    <DeleteDecision id={d.id} />
                  </li>
                ))}
            </ul>
            <AddDecision meetingId={selected.id} />
          </div>
        </section>
      )}

      <section aria-labelledby="up">
        <h2 id="up" className="section-title mb-2">
          Найближчі
        </h2>
        <div className="border-t border-border">{upcoming.length ? upcoming.map(row) : <Empty>Запланованих зустрічей немає.</Empty>}</div>
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past">
          <h2 id="past" className="section-title mb-2">
            Минулі
          </h2>
          <div className="border-t border-border">{past.map(row)}</div>
        </section>
      )}

      <section aria-labelledby="log">
        <h2 id="log" className="section-title mb-2">
          Журнал рішень
        </h2>
        {allDecisions.length === 0 ? (
          <Empty>Рішень ще немає. Відкрийте зустріч і додайте перше.</Empty>
        ) : (
          <ul className="border-t border-border">
            {allDecisions.map((d) => (
              <li key={d.id} className="grid grid-cols-1 gap-x-4 border-b border-border px-2 py-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                <span>{d.text}</span>
                <span className="text-sm text-text2 sm:text-right">
                  {meetingTitle(d.meetingId) ?? "Без зустрічі"} · {nameOf(d.createdBy)} · {relTime(d.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <AddDecision meetingId={null} />
        </div>
      </section>
    </div>
  );
}
