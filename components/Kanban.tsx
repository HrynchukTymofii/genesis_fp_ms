"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveTask } from "@/app/actions/tasks";
import { TASK_STATUSES, TASK_STATUS_COLOR, TASK_STATUS_LABEL, type TaskStatus } from "@/lib/labels";
import type { CardTask } from "@/lib/tasks";
import { TaskCard } from "@/components/TaskCard";
import { useTaskPanel } from "@/components/TaskPanel";
import { useToast } from "@/components/Toast";
import { Tag } from "@/components/Tag";

/** Optimistic status moves with server-side Done rule and rollback. */
function useOptimisticMoves(tasks: CardTask[]) {
  const router = useRouter();
  const toast = useToast();
  const [local, setLocal] = useState(tasks);
  const [seen, setSeen] = useState(tasks);
  if (seen !== tasks) {
    // fresh server data arrived (router.refresh): drop optimistic state
    setSeen(tasks);
    setLocal(tasks);
  }
  const [, start] = useTransition();

  const move = (id: number, status: TaskStatus) => {
    const before = local;
    const task = local.find((t) => t.id === id);
    if (!task || task.status === status) return;
    setLocal((ts) =>
      ts.map((t) =>
        t.id === id ? { ...t, status, doneAt: status === "done" ? new Date().toISOString() : null } : t,
      ),
    );
    start(async () => {
      const res = await moveTask(id, status).catch((e: Error) => ({ ok: false as const, error: e.message }));
      if (!res.ok) {
        setLocal(before);
        toast(res.error, "error");
      }
      router.refresh();
    });
  };
  return { local, move };
}

function useBoardSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
}

function Draggable({ id, children }: { id: number; children: (dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="listitem"
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 30, position: "relative" } : undefined}
      className="touch-manipulation"
    >
      {children(isDragging)}
    </div>
  );
}

function Column({
  id,
  title,
  count,
  disabled,
  children,
  footer,
}: {
  id: string;
  title: ReactNode;
  count: number;
  disabled?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <section
      ref={setNodeRef}
      aria-label={typeof title === "string" ? title : undefined}
      className={`flex min-w-0 flex-col gap-1.5 rounded-md p-1.5 transition-colors ${isOver ? "bg-hover" : ""}`}
    >
      <header className="flex items-center gap-2 px-1 pb-1 text-text2">
        {title}
        <span className="text-text3">{count}</span>
      </header>
      <div role="list" className="flex flex-col gap-1.5">
        {children}
      </div>
      {footer}
    </section>
  );
}

const onDragEnd =
  (move: (id: number, s: TaskStatus) => void, map: (columnId: string) => TaskStatus | null) =>
  (e: DragEndEvent) => {
    if (!e.over) return;
    const status = map(String(e.over.id));
    if (status) move(Number(e.active.id), status);
  };

/** Full Kanban for /board. */
export function Board({ tasks, today }: { tasks: CardTask[]; today: string }) {
  const { local, move } = useOptimisticMoves(tasks);
  const { openNew } = useTaskPanel();
  const sensors = useBoardSensors();

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd(move, (c) => (TASK_STATUSES as readonly string[]).includes(c) ? (c as TaskStatus) : null)}
    >
      <div className="-mx-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUSES.map((s) => {
          const col = local
            .filter((t) => t.status === s)
            .sort((a, b) =>
              s === "done"
                ? (b.doneAt ?? "").localeCompare(a.doneAt ?? "")
                : (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"),
            );
          return (
            <Column
              key={s}
              id={s}
              title={<Tag color={TASK_STATUS_COLOR[s]}>{TASK_STATUS_LABEL[s]}</Tag>}
              count={col.length}
              footer={
                s !== "done" && (
                  <button
                    type="button"
                    className="btn btn-ghost justify-start text-text3"
                    onClick={() => openNew({ status: s })}
                  >
                    + Нова
                  </button>
                )
              }
            >
              {col.map((t) => (
                <Draggable key={t.id} id={t.id}>
                  {(dragging) => <TaskCard task={t} today={today} dragging={dragging} />}
                </Draggable>
              ))}
            </Column>
          );
        })}
      </div>
    </DndContext>
  );
}

/** "What's moving" on Home: Due soon / In progress / Recently done. */
export function HomeKanban({ tasks, today, weekAgo }: { tasks: CardTask[]; today: string; weekAgo: string }) {
  const { local, move } = useOptimisticMoves(tasks);
  const sensors = useBoardSensors();

  const dueAll = local
    .filter((t) => t.status !== "done" && t.dueDate)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.id - b.id);
  const due = dueAll.slice(0, 10);
  const doing = local
    .filter((t) => t.status === "doing" || t.status === "review")
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const done = local
    .filter((t) => t.status === "done" && t.doneAt && t.doneAt >= weekAgo)
    .sort((a, b) => b.doneAt!.localeCompare(a.doneAt!))
    .slice(0, 10);

  const empty = (text: string) => <p className="px-1 py-2 text-text3">{text}</p>;

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={onDragEnd(move, (c) => (c === "home-doing" ? "doing" : c === "home-done" ? "done" : null))}
    >
      <div className="-mx-1.5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Column
          id="home-due"
          disabled
          title={<span className="font-medium text-text">Скоро дедлайн</span>}
          count={dueAll.length}
          footer={
            dueAll.length > 10 && (
              <Link href="/board?due=1" className="link px-1 text-sm">
                Показати всі ({dueAll.length})
              </Link>
            )
          }
        >
          {due.length === 0 && empty("Немає задач із дедлайном.")}
          {due.map((t) => (
            <Draggable key={t.id} id={t.id}>
              {(d) => <TaskCard task={t} today={today} dragging={d} />}
            </Draggable>
          ))}
        </Column>
        <Column id="home-doing" title={<span className="font-medium text-text">В роботі</span>} count={doing.length}>
          {doing.length === 0 && empty("Перетягніть сюди задачу, щоб почати.")}
          {doing.map((t) => (
            <Draggable key={t.id} id={t.id}>
              {(d) => <TaskCard task={t} today={today} dragging={d} />}
            </Draggable>
          ))}
        </Column>
        <Column id="home-done" title={<span className="font-medium text-text">Нещодавно готово</span>} count={done.length}>
          {done.length === 0 && empty("За останні 7 днів нічого не завершено.")}
          {done.map((t) => (
            <Draggable key={t.id} id={t.id}>
              {(d) => <TaskCard task={t} today={today} variant="done" dragging={d} />}
            </Draggable>
          ))}
        </Column>
      </div>
    </DndContext>
  );
}
