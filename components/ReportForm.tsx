"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { submitReport, type ReportState } from "@/app/actions/reports";
import { uploadResourceFile } from "@/app/actions/resources";
import type { ReportLink } from "@/db/schema";
import { REPORT_STATUSES, REPORT_STATUS_COLOR, REPORT_STATUS_LABEL, type ReportStatus } from "@/lib/labels";
import { useAppData } from "@/components/AppData";
import { DictationField } from "@/components/Dictation";
import { domainOf, Favicon } from "@/components/LinkList";
import { useToast } from "@/components/Toast";

type Existing = { done: string; next: string; blockers: string; status: string; links: ReportLink[] } | null;
type Pick = { id: number; title: string; url: string };

export function ReportForm({
  meetingId,
  heading,
  deadline,
  deadlineTag,
  existing,
  resources,
}: {
  meetingId: number;
  heading: string;
  deadline: string;
  deadlineTag: { text: string; color: string };
  existing: Existing;
  resources: Pick[];
}) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});
  const toast = useToast();
  const last = useRef(state);
  const [f, setF] = useState({
    done: existing?.done ?? "",
    next: existing?.next ?? "",
    blockers: existing?.blockers ?? "",
    status: (existing?.status ?? "on_track") as ReportStatus,
  });
  const [links, setLinks] = useState<ReportLink[]>(existing?.links ?? []);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) toast(existing ? "Звіт оновлено." : "Звіт здано. Дякую!");
  }, [state, toast, existing]);

  return (
    <form action={action} className="card overflow-hidden">
      <input type="hidden" name="meetingId" value={meetingId} />
      <input type="hidden" name="status" value={f.status} />
      <input type="hidden" name="links" value={JSON.stringify(links)} />

      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-5 py-4">
        <div>
          <h2 className="section-title">{heading}</h2>
          <p className="mt-0.5 capitalize text-text2">Дедлайн: {deadline}</p>
        </div>
        <span className={`tag tag-${deadlineTag.color}`}>{deadlineTag.text}</span>
      </header>

      <div className="flex flex-col gap-5 px-5 py-5">
        <p className="-mt-1 text-sm text-text3">🎤 Можна продиктувати голосом (українською). Повторна відправка оновить звіт.</p>
        <Field emoji="✅" label="Що зроблено з минулого синку">
          <DictationField multiline name="done" label="Що зроблено" required value={f.done} onChange={set("done")} placeholder="Провела 2 інтерв’ю, оновила синтез…" />
        </Field>
        <Field emoji="➡️" label="Що зроблю до наступного синку">
          <DictationField multiline name="next" label="Що далі" required value={f.next} onChange={set("next")} placeholder="Скрипт для юзабіліті, ще 3 інтерв’ю…" />
        </Field>
        <Field emoji="🚧" label="Блокери" optional>
          <DictationField name="blockers" label="Блокери" value={f.blockers} onChange={set("blockers")} placeholder="Чекаю на дані від…" />
        </Field>
        <Field emoji="🔗" label="Матеріали та посилання" optional>
          <LinksEditor links={links} onChange={setLinks} resources={resources} />
        </Field>
        <Field emoji="🚦" label="Статус">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Статус">
            {REPORT_STATUSES.map((s) => {
              const c = REPORT_STATUS_COLOR[s];
              const on = f.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set("status")(s)}
                  className={`pill h-8 px-3 ${on ? `tag-${c} !border-transparent font-medium` : ""}`}
                >
                  <span aria-hidden className={`inline-block size-2 rounded-full dot-${c}`} />
                  {REPORT_STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </Field>
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-sidebar px-5 py-3">
        <button className="btn btn-primary h-9 px-4" disabled={pending}>
          {pending ? "Зберігаю…" : existing ? "Оновити звіт" : "Здати звіт"}
        </button>
        {state.error && (
          <span className="text-danger" role="alert">
            {state.error}
          </span>
        )}
      </footer>
    </form>
  );
}

function Field({ emoji, label, optional, children }: { emoji: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-medium">
        <span aria-hidden className="mr-1.5">{emoji}</span>
        {label}
        {optional && <span className="ml-1.5 font-normal text-text3">необов’язково</span>}
      </span>
      {children}
    </div>
  );
}

function LinksEditor({
  links,
  onChange,
  resources,
}: {
  links: ReportLink[];
  onChange: (l: ReportLink[]) => void;
  resources: Pick[];
}) {
  const { blobEnabled } = useAppData();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [uploading, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const add = (l: ReportLink) => {
    if (links.some((x) => x.url === l.url)) return;
    onChange([...links, l]);
  };
  const unused = resources.filter((r) => !links.some((l) => l.url === r.url));

  return (
    <div className="flex flex-col gap-1.5">
      {links.length > 0 && (
        <ul className="flex flex-col rounded-md border border-border">
          {links.map((l) => (
            <li key={l.url} className="group row-hover flex min-w-0 items-center gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              {l.kind === "file" ? <span aria-hidden>📎</span> : <Favicon url={l.url} />}
              <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate">
                {l.title || domainOf(l.url)}
                {l.title && <span className="ml-1.5 text-xs text-text3">{domainOf(l.url)}</span>}
              </a>
              <button
                type="button"
                aria-label={`Прибрати посилання ${l.title || domainOf(l.url)}`}
                className="text-text3 hover:text-danger sm:opacity-0 sm:focus:opacity-100 sm:group-hover:opacity-100"
                onClick={() => onChange(links.filter((x) => x.url !== l.url))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-1.5 rounded-md border border-border p-2.5">
          <input
            autoFocus
            className="input"
            placeholder="https://…"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
          <input
            className="input"
            placeholder="Назва (необов’язково)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!url.trim()}
              onClick={() => {
                const u = url.trim();
                add({ url: /^https?:\/\//i.test(u) ? u : `https://${u}`, title: title.trim(), kind: "link" });
                setUrl("");
                setTitle("");
                setAdding(false);
              }}
            >
              Додати
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Скасувати
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            + Посилання
          </button>
          {unused.length > 0 && (
            <select
              aria-label="Додати з ресурсів"
              className="btn max-w-60 pr-2"
              value=""
              onChange={(e) => {
                const r = resources.find((x) => x.id === Number(e.target.value));
                if (r) add({ url: r.url, title: r.title, kind: "link" });
              }}
            >
              <option value="">📚 З ресурсів…</option>
              {unused.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}
          {blobEnabled && (
            <>
              <button type="button" className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? "Завантаження…" : "📎 Файл"}
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) return toast("Файл більший за 10 МБ.", "error");
                  const fd = new FormData();
                  fd.set("file", file);
                  start(async () => {
                    const res = await uploadResourceFile(fd);
                    if (!res.ok) return toast(res.error, "error");
                    add({ url: res.url, title: res.name, kind: "file" });
                  });
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
