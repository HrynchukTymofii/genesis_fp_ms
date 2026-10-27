"use client";

import { useRef, useState, useTransition } from "react";
import { addTaskLink, attachTaskFile, removeTaskLink } from "@/app/actions/tasks";
import type { TaskLink } from "@/db/schema";
import { useAppData } from "@/components/AppData";
import { useToast } from "@/components/Toast";

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function Favicon({ url, size = 16 }: { url: string; size?: number }) {
  const domain = domainOf(url);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-sm"
      loading="lazy"
    />
  );
}

export function LinkList({
  taskId,
  links,
  onChange,
}: {
  taskId: number;
  links: TaskLink[];
  onChange: () => Promise<void>;
}) {
  const { blobEnabled } = useAppData();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-0.5 py-1">
      {links.map((l) => (
        <div key={l.id} className="group row-hover flex min-w-0 items-center gap-2 rounded px-1.5 py-1">
          {l.kind === "file" ? <span aria-hidden>📎</span> : <Favicon url={l.url} />}
          <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate">
            <span className="text-text">{l.title || domainOf(l.url)}</span>
            {l.title && <span className="ml-1.5 text-xs text-text3">{domainOf(l.url)}</span>}
          </a>
          <button
            type="button"
            aria-label="Видалити посилання"
            className="text-text3 opacity-0 hover:text-danger focus:opacity-100 group-hover:opacity-100"
            onClick={() =>
              start(async () => {
                await removeTaskLink(l.id);
                await onChange();
              })
            }
          >
            ✕
          </button>
        </div>
      ))}

      {adding ? (
        <form
          className="flex flex-col gap-1.5 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await addTaskLink(taskId, { url, title });
              if (!res.ok) return toast(res.error, "error");
              setUrl("");
              setTitle("");
              setAdding(false);
              await onChange();
            });
          }}
        >
          <input
            autoFocus
            className="input"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            inputMode="url"
          />
          <input
            className="input"
            placeholder="Назва (необов’язково)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex gap-1.5">
            <button className="btn btn-primary" disabled={pending}>
              Додати
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Скасувати
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-1">
          <button type="button" className="btn btn-ghost h-7 px-1.5 text-text3" onClick={() => setAdding(true)}>
            + Додати посилання
          </button>
          {blobEnabled && (
            <>
              <button
                type="button"
                className="btn btn-ghost h-7 px-1.5 text-text3"
                disabled={pending}
                onClick={() => fileRef.current?.click()}
              >
                {pending ? "Завантаження…" : "📎 Прикріпити файл"}
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
                    const res = await attachTaskFile(taskId, fd);
                    if (!res.ok) toast(res.error, "error");
                    await onChange();
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
