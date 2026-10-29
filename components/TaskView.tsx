"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  createTask,
  deleteTask,
  getTaskDetail,
  moveTask,
  saveTaskBody,
  updateTask,
  type TaskDetail,
} from "@/app/actions/tasks";
import { relTime } from "@/lib/dates";
import { TASK_STATUSES, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/labels";
import { useAppData } from "@/components/AppData";
import { DocEditor } from "@/components/DocEditor";
import { roomId } from "@/lib/collab";
import { LinkList } from "@/components/LinkList";
import { PropertyRow } from "@/components/Tag";
import { useToast } from "@/components/Toast";

export type NewTaskDefaults = { directionSlug?: string; status?: TaskStatus; dueDate?: string };

/** Full task editor, used in the side panel and on /tasks/[id]. */
export function TaskView({
  taskId,
  initial,
  onDeleted,
}: {
  taskId: number;
  initial?: TaskDetail;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { members, directions, memberName } = useAppData();
  const [detail, setDetail] = useState<TaskDetail | null | undefined>(initial);
  const [, start] = useTransition();

  const reload = useCallback(async () => {
    setDetail(await getTaskDetail(taskId));
  }, [taskId]);

  useEffect(() => {
    if (initial) return;
    let live = true;
    getTaskDetail(taskId).then((d) => live && setDetail(d));
    return () => {
      live = false;
    };
  }, [initial, taskId]);

  if (detail === undefined) return <p className="text-text3">Завантаження…</p>;
  if (detail === null) return <p className="text-text3">Цю задачу видалено.</p>;

  const { task, direction } = detail;
  const ownerFallback = direction.ownerId;
  const reviewerFallback = direction.reviewerId;

  const patch = (p: Parameters<typeof updateTask>[1]) =>
    start(async () => {
      setDetail((d) => d && { ...d, task: { ...d.task, ...p } as typeof d.task });
      await updateTask(task.id, p);
      await reload();
      router.refresh();
    });

  const changeStatus = (status: TaskStatus) =>
    start(async () => {
      const res = await moveTask(task.id, status);
      if (!res.ok) toast(res.error, "error");
      await reload();
      router.refresh();
    });

  const memberOptions = (fallback: number | null, label: string) => (
    <>
      <option value="">
        {fallback ? `${memberName(fallback)} (${label})` : "— не призначено —"}
      </option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </>
  );

  return (
    <article>
      <TitleInput
        key={task.title}
        value={task.title}
        onSave={(title) => title !== task.title && patch({ title })}
      />

      <div className="mt-4 flex flex-col">
        <PropertyRow label="Статус" icon="◉">
          <select
            className="input-bare h-[30px]"
            value={task.status}
            onChange={(e) => changeStatus(e.target.value as TaskStatus)}
            aria-label="Статус"
          >
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </PropertyRow>
        <PropertyRow label="Напрям" icon="🧭">
          <select
            className="input-bare h-[30px]"
            value={task.directionSlug}
            onChange={(e) => patch({ directionSlug: e.target.value })}
            aria-label="Напрям"
          >
            {directions.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.emoji} {d.name}
              </option>
            ))}
          </select>
        </PropertyRow>
        <PropertyRow label="Виконавець" icon="👤">
          <select
            className="input-bare h-[30px]"
            value={task.ownerId ?? ""}
            onChange={(e) => patch({ ownerId: e.target.value ? Number(e.target.value) : null })}
            aria-label="Виконавець"
          >
            {memberOptions(ownerFallback, "власник напряму")}
          </select>
        </PropertyRow>
        <PropertyRow label="Рецензент" icon="✓">
          <select
            className="input-bare h-[30px]"
            value={task.reviewerId ?? ""}
            onChange={(e) => patch({ reviewerId: e.target.value ? Number(e.target.value) : null })}
            aria-label="Рецензент"
          >
            {memberOptions(reviewerFallback, "рецензент напряму")}
          </select>
        </PropertyRow>
        <PropertyRow label="Дедлайн" icon="📅">
          <input
            type="date"
            className="input-bare h-[30px] w-auto"
            value={task.dueDate ?? ""}
            min="2026-10-01"
            max="2026-12-31"
            onChange={(e) => patch({ dueDate: e.target.value || null })}
            aria-label="Дедлайн"
          />
        </PropertyRow>
        <PropertyRow label="Посилання" icon="🔗">
          <LinkList taskId={task.id} links={detail.links} onChange={async () => { await reload(); router.refresh(); }} />
        </PropertyRow>
      </div>

      <hr className="my-5 border-border" />

      <div className="pt-4">
        <DocEditor
          key={task.id}
          room={roomId("task", task.id)}
          initialContent={task.body}
          onSave={(doc) => saveTaskBody(task.id, doc)}
          placeholder="Пишіть тут: нотатки, підсумки інтерв’ю, чернетки. Наберіть «/» для блоків."
        />
      </div>

      <footer className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs text-text3">
        <span>
          Створив(ла) {memberName(task.createdBy) ?? "сід"} · востаннє редагував(ла){" "}
          {memberName(task.updatedBy) ?? "—"}, {relTime(new Date(task.updatedAt))}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-danger ml-auto h-6 px-2 text-xs"
          onClick={() => {
            if (!window.confirm("Видалити цю задачу? Це не можна скасувати.")) return;
            start(async () => {
              await deleteTask(task.id);
              router.refresh();
              onDeleted?.();
            });
          }}
        >
          Видалити
        </button>
      </footer>
    </article>
  );
}

function TitleInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <textarea
      rows={1}
      value={v}
      aria-label="Назва задачі"
      onChange={(e) => setV(e.target.value.replace(/\n/g, ""))}
      onBlur={() => v.trim() && onSave(v.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="page-title field-sizing-content w-full resize-none bg-transparent outline-none placeholder:text-text3"
      placeholder="Без назви"
    />
  );
}

export function NewTaskForm({ defaults, onCreated }: { defaults: NewTaskDefaults; onCreated: (id: number) => void }) {
  const { directions } = useAppData();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState(defaults.directionSlug ?? directions[0]?.slug ?? "");
  const [due, setDue] = useState(defaults.dueDate ?? "");
  const [pending, start] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        start(async () => {
          const id = await createTask({
            title,
            directionSlug: slug,
            dueDate: due || null,
            status: defaults.status,
          });
          router.refresh();
          onCreated(id);
        });
      }}
    >
      <h2 className="page-title mb-4">Нова задача</h2>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-text2">Назва</span>
          <input autoFocus className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text2">Напрям</span>
          <select className="input" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {directions.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.emoji} {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-text2">Дедлайн</span>
          <input type="date" className="input w-auto" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <div>
          <button className="btn btn-primary" disabled={pending || !title.trim()}>
            {pending ? "Створюю…" : "Створити задачу"}
          </button>
        </div>
      </div>
    </form>
  );
}
