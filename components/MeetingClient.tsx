"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addDecision,
  deleteDecision,
  deleteMeeting,
  saveMeeting,
  saveMeetingNotes,
  type MeetingState,
} from "@/app/actions/meetings";
import { MEETING_KINDS, MEETING_KIND_LABEL } from "@/lib/labels";
import { DocEditor } from "@/components/DocEditor";
import { useToast } from "@/components/Toast";

export function MeetingNotes({ id, notes }: { id: number; notes: unknown }) {
  return (
    <DocEditor
      key={id}
      initialContent={notes}
      onSave={(doc) => saveMeetingNotes(id, doc)}
      placeholder="Нотатки зустрічі. Наберіть «/» для заголовків, списків, чекбоксів."
    />
  );
}

export function AddDecision({ meetingId }: { meetingId: number | null }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        start(async () => {
          await addDecision(meetingId, text);
          setText("");
          router.refresh();
        });
      }}
    >
      <input
        className="input"
        placeholder="Записати рішення…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Нове рішення"
      />
      <button className="btn" disabled={pending || !text.trim()}>
        Додати
      </button>
    </form>
  );
}

export function DeleteDecision({ id }: { id: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Видалити рішення"
      title="Видалити рішення"
      disabled={pending}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded text-text3 hover:bg-hover hover:text-danger disabled:opacity-50"
      onClick={() => {
        if (!window.confirm("Видалити це рішення? Це не можна скасувати.")) return;
        start(async () => {
          try {
            await deleteDecision(id);
            router.refresh();
          } catch (err) {
            toast((err as Error).message || "Не вдалося видалити рішення.", "error");
          }
        });
      }}
    >
      ✕
    </button>
  );
}

type MeetingDraft = {
  id?: number;
  title: string;
  startsAt: string; // Kyiv "yyyy-MM-ddTHH:mm"
  durationMin: number;
  agenda: string;
  kind: string;
  meetUrl: string;
};

export function MeetingEditor({ initial, onDone }: { initial?: MeetingDraft; onDone?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<MeetingState, FormData>(saveMeeting, {});
  const [, start] = useTransition();
  const handled = useRef(state);
  useEffect(() => {
    if (state === handled.current || !state.ok) return;
    handled.current = state;
    router.refresh();
    onDone?.();
  }, [state, router, onDone]);
  const d = initial ?? { title: "", startsAt: "", durationMin: 30, agenda: "", kind: "sync", meetUrl: "" };

  return (
    <form action={action} className="card flex flex-col gap-3 p-4">
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-text2">Назва</span>
        <input name="title" className="input" defaultValue={d.title} required />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-text2">Початок (Київ)</span>
          <input name="startsAt" type="datetime-local" className="input" defaultValue={d.startsAt} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text2">Тривалість, хв</span>
          <input name="durationMin" type="number" min={5} max={480} className="input" defaultValue={d.durationMin} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text2">Тип</span>
          <select name="kind" className="input" defaultValue={d.kind}>
            {MEETING_KINDS.map((k) => (
              <option key={k} value={k}>
                {MEETING_KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <span className="text-xs text-text3">Для синку кожен автоматично отримує звіт, який треба здати за 2 год до початку.</span>
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-text2">Посилання на Google Meet</span>
        <input
          name="meetUrl"
          inputMode="url"
          className="input"
          defaultValue={d.meetUrl}
          placeholder="https://meet.google.com/abc-defg-hij"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-text2">Порядок денний (кожен пункт з нового рядка)</span>
        <textarea name="agenda" rows={4} className="input field-sizing-content" defaultValue={d.agenda} />
      </label>
      {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Зберігаю…" : d.id ? "Зберегти" : "Додати зустріч"}
        </button>
        {onDone && (
          <button type="button" className="btn btn-ghost" onClick={onDone}>
            Скасувати
          </button>
        )}
        {d.id && (
          <button
            type="button"
            className="btn btn-ghost btn-danger ml-auto"
            onClick={() => {
              if (!window.confirm("Видалити цю зустріч?")) return;
              start(async () => {
                await deleteMeeting(d.id!);
                router.push("/meetings");
                router.refresh();
              });
            }}
          >
            Видалити
          </button>
        )}
      </div>
    </form>
  );
}

export function ToggleEditor({ label, initial }: { label: string; initial?: MeetingDraft }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  return (
    <div className="w-full">
      <MeetingEditor initial={initial} onDone={() => setOpen(false)} />
    </div>
  );
}

/** A meeting row in the list with an inline "Змінити" editor below it. */
export function EditableMeetingRow({ draft, children }: { draft: MeetingDraft; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <div className="flex items-center">
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          className="btn btn-ghost mx-1.5 shrink-0"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Скасувати" : "✎ Змінити"}
        </button>
      </div>
      {open && (
        <div className="px-2 pb-3">
          <MeetingEditor initial={draft} onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
