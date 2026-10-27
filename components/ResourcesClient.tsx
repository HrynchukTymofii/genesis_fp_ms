"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { deleteResource, saveResource, uploadResourceFile, type ResourceInput } from "@/app/actions/resources";
import { relTime } from "@/lib/dates";
import { embedUrl } from "@/lib/embed";
import { RESOURCE_CATEGORIES, RESOURCE_KINDS, type ResourceCategory } from "@/lib/labels";
import { useAppData } from "@/components/AppData";
import { domainOf, Favicon } from "@/components/LinkList";
import { Tag } from "@/components/Tag";
import { useToast } from "@/components/Toast";

export type ResourceRow = {
  id: number;
  title: string;
  url: string | null;
  category: string;
  kind: string;
  directionSlug: string | null;
  note: string;
  updatedBy: number | null;
  updatedAt: string;
};

type Editing = { id: number | null; draft: ResourceInput } | null;

const kindOf = (k: string) => RESOURCE_KINDS.find((x) => x.key === k) ?? RESOURCE_KINDS[6];

export function ResourcesClient({ rows }: { rows: ResourceRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [query, setQuery] = useState("");
  const [dir, setDir] = useState("");
  const { directions } = useAppData();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!dir || r.directionSlug === dir) &&
        (!q || `${r.title} ${r.note} ${r.url ?? ""}`.toLowerCase().includes(q)),
    );
  }, [rows, query, dir]);

  const startNew = (category: ResourceCategory = "other") =>
    setEditing({
      id: null,
      draft: { title: "", url: "", category, kind: category === "product" ? "presentation" : "sheet", directionSlug: null, note: "" },
    });
  const startEdit = (r: ResourceRow) =>
    setEditing({
      id: r.id,
      draft: { title: r.title, url: r.url ?? "", category: r.category, kind: r.kind, directionSlug: r.directionSlug, note: r.note },
    });

  const product = filtered.filter((r) => r.category === "product");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          className="input max-w-xs"
          placeholder="Пошук ресурсів…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Пошук ресурсів"
        />
        <select className="input w-auto" value={dir} onChange={(e) => setDir(e.target.value)} aria-label="Напрям">
          <option value="">Усі напрями</option>
          {directions.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.emoji} {d.name}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary ml-auto" onClick={() => startNew()}>
          + Додати ресурс
        </button>
      </div>

      <section aria-labelledby="cat-product" className="mb-10">
        <CategoryHeader cat="product" onAdd={() => startNew("product")} />
        {product.length === 0 ? (
          <p className="text-text3">Додайте посилання на презентацію, живе MVP і таблицю з цифрами.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {product.map((r) => (
              <ProductCard key={r.id} r={r} onEdit={() => startEdit(r)} />
            ))}
          </div>
        )}
      </section>

      {RESOURCE_CATEGORIES.filter((c) => c.key !== "product").map((c) => {
        const list = filtered.filter((r) => r.category === c.key);
        if (list.length === 0 && (query || dir)) return null;
        return (
          <section key={c.key} aria-labelledby={`cat-${c.key}`} className="mb-10">
            <CategoryHeader cat={c.key} onAdd={() => startNew(c.key)} />
            <div className="border-t border-border">
              {list.map((r) => (
                <ResourceTableRow key={r.id} r={r} onEdit={() => startEdit(r)} />
              ))}
              <button
                type="button"
                onClick={() => startNew(c.key)}
                className="row-hover flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left text-text3"
              >
                + Додати
              </button>
            </div>
          </section>
        );
      })}

      {editing && <ResourceDialog editing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CategoryHeader({ cat, onAdd }: { cat: ResourceCategory; onAdd: () => void }) {
  const c = RESOURCE_CATEGORIES.find((x) => x.key === cat)!;
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <h2 id={`cat-${cat}`} className="section-title">
        <span aria-hidden>{c.emoji}</span> {c.label}
      </h2>
      <span className="hidden text-text3 sm:inline">{c.hint}</span>
      <button type="button" onClick={onAdd} className="btn btn-ghost ml-auto h-6 px-2 text-xs" aria-label={`Додати в «${c.label}»`}>
        +
      </button>
    </div>
  );
}

function DirectionTag({ slug }: { slug: string | null }) {
  const { direction } = useAppData();
  const d = slug ? direction(slug) : undefined;
  if (!d) return null;
  return (
    <Tag color={d.color}>
      {d.emoji} {d.name}
    </Tag>
  );
}

function ProductCard({ r, onEdit }: { r: ResourceRow; onEdit: () => void }) {
  const [preview, setPreview] = useState(false);
  const embed = r.url ? embedUrl(r.url) : null;
  const kind = kindOf(r.kind);
  return (
    <div className={`card flex flex-col ${preview ? "sm:col-span-2" : ""}`}>
      <div className="flex items-start gap-3 p-3">
        <span aria-hidden className="mt-0.5 text-xl">{kind.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{r.title}</div>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="link flex items-center gap-1.5 truncate text-sm">
              <Favicon url={r.url} size={14} />
              {domainOf(r.url)}
            </a>
          ) : (
            <button type="button" onClick={onEdit} className="text-sm text-accent hover:underline">
              + Додати посилання
            </button>
          )}
          {r.note && <p className="mt-1 text-sm text-text2">{r.note}</p>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <DirectionTag slug={r.directionSlug} />
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          {embed && (
            <button type="button" className="btn btn-ghost h-7 px-2 text-xs" onClick={() => setPreview((v) => !v)} aria-expanded={preview}>
              {preview ? "Сховати" : "Переглянути"}
            </button>
          )}
          <button type="button" className="btn btn-ghost h-7 px-2 text-xs" onClick={onEdit}>
            Змінити
          </button>
        </div>
      </div>
      {preview && embed && (
        <div className="border-t border-border">
          <iframe
            src={embed}
            title={r.title}
            className="block aspect-video w-full rounded-b"
            allowFullScreen
            loading="lazy"
          />
          <p className="px-3 py-1.5 text-xs text-text3">
            Не відображається? Відкрийте доступ «Усі, хто має посилання» у налаштуваннях файлу.
          </p>
        </div>
      )}
    </div>
  );
}

function ResourceTableRow({ r, onEdit }: { r: ResourceRow; onEdit: () => void }) {
  const { memberName } = useAppData();
  const kind = kindOf(r.kind);
  return (
    <div className="row-hover group grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border px-2 py-1.5 sm:grid-cols-[20px_minmax(0,1.4fr)_110px_minmax(0,1fr)_150px_auto]">
      {r.url ? <Favicon url={r.url} /> : <span aria-hidden className="text-center text-text3">○</span>}
      <div className="min-w-0">
        {r.url ? (
          <a href={r.url} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
            {r.title}
          </a>
        ) : (
          <span className="block truncate text-text2">{r.title}</span>
        )}
        <div className="truncate text-xs text-text3">
          {r.url ? domainOf(r.url) : (
            <button type="button" onClick={onEdit} className="text-accent hover:underline">
              + додати посилання
            </button>
          )}
          {r.note && <span className="sm:hidden"> · {r.note}</span>}
        </div>
      </div>
      <span className="hidden sm:block">
        <Tag color="gray">
          {kind.emoji} {kind.label}
        </Tag>
      </span>
      <span className="hidden min-w-0 truncate text-sm text-text2 sm:block" title={r.note}>
        {r.note || <DirectionTag slug={r.directionSlug} />}
      </span>
      <span className="hidden truncate text-xs text-text3 sm:block">
        {memberName(r.updatedBy) ? `${memberName(r.updatedBy)}, ${relTime(new Date(r.updatedAt))}` : ""}
      </span>
      <button type="button" className="btn btn-ghost h-7 px-2 text-xs sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" onClick={onEdit}>
        Змінити
      </button>
    </div>
  );
}

function ResourceDialog({ editing, onClose }: { editing: NonNullable<Editing>; onClose: () => void }) {
  const { directions, blobEnabled } = useAppData();
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState(editing.draft);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ResourceInput>(k: K, v: ResourceInput[K]) => setD((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/20" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="res-dialog-title"
        className="fixed inset-x-4 top-[8vh] z-[61] mx-auto max-h-[84vh] max-w-lg overflow-y-auto rounded-md border border-border bg-bg p-5 shadow-[0_8px_30px_rgba(15,15,15,0.15)]"
      >
        <h2 id="res-dialog-title" className="section-title mb-4">
          {editing.id ? "Змінити ресурс" : "Новий ресурс"}
        </h2>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await saveResource(editing.id, d);
              if (!res.ok) return setError(res.error);
              router.refresh();
              onClose();
            });
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-text2">Назва</span>
            <input autoFocus className="input" value={d.title} onChange={(e) => set("title", e.target.value)} required placeholder="Напр., Лонг-ліст ніш v2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-text2">Посилання</span>
            <div className="flex gap-2">
              <input className="input" inputMode="url" value={d.url} onChange={(e) => set("url", e.target.value)} placeholder="https://docs.google.com/…" />
              {blobEnabled && (
                <>
                  <button type="button" className="btn shrink-0" disabled={pending} onClick={() => fileRef.current?.click()}>
                    📎 Файл
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
                        setD((x) => ({ ...x, url: res.url, kind: "file", title: x.title || res.name }));
                      });
                    }}
                  />
                </>
              )}
            </div>
            <span className="text-xs text-text3">Можна залишити порожнім і додати пізніше.</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-text2">Розділ</span>
              <select className="input" value={d.category} onChange={(e) => set("category", e.target.value)}>
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-text2">Тип</span>
              <select className="input" value={d.kind} onChange={(e) => set("kind", e.target.value)}>
                {RESOURCE_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.emoji} {k.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-text2">Напрям (необов’язково)</span>
            <select className="input" value={d.directionSlug ?? ""} onChange={(e) => set("directionSlug", e.target.value || null)}>
              <option value="">— без напряму —</option>
              {directions.map((x) => (
                <option key={x.slug} value={x.slug}>
                  {x.emoji} {x.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-text2">Нотатка</span>
            <textarea className="input field-sizing-content min-h-14" value={d.note} onChange={(e) => set("note", e.target.value)} placeholder="Що тут, яка версія, звідки дані…" />
          </label>
          {error && <p className="text-danger" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "Зберігаю…" : "Зберегти"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Скасувати
            </button>
            {editing.id && (
              <button
                type="button"
                className="btn btn-ghost btn-danger ml-auto"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Видалити цей ресурс?")) return;
                  start(async () => {
                    await deleteResource(editing.id!);
                    router.refresh();
                    onClose();
                  });
                }}
              >
                Видалити
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
