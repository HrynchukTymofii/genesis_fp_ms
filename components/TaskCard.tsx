"use client";

import type { CardTask } from "@/lib/tasks";
import { fmtDay, relTime } from "@/lib/dates";
import { shortName } from "@/lib/names";
import { useAppData } from "@/components/AppData";
import { Tag } from "@/components/Tag";
import { useTaskPanel } from "@/components/TaskPanel";

export function TaskCard({
  task,
  today,
  variant = "default",
  dragging = false,
}: {
  task: CardTask;
  today: string;
  variant?: "default" | "done";
  dragging?: boolean;
}) {
  const { direction, memberName } = useAppData();
  const { open } = useTaskPanel();
  const dir = direction(task.directionSlug);
  const overdue = task.status !== "done" && task.dueDate != null && task.dueDate < today;

  return (
    <button
      type="button"
      onClick={() => open(task.id)}
      className={`card card-hover block w-full px-2.5 py-2 text-left ${dragging ? "opacity-60" : ""}`}
    >
      <div className="mb-1.5 line-clamp-3 font-medium leading-snug">{task.title}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text2">
        {dir && (
          <Tag color={dir.color}>
            {dir.emoji} {dir.name}
          </Tag>
        )}
        {task.status === "review" && variant !== "done" && (
          <Tag color="purple">На перевірці · {shortName(memberName(task.reviewerId))}</Tag>
        )}
        {overdue && <Tag color="red">Прострочено</Tag>}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-text2">
        {variant === "done" && task.doneAt ? (
          <span>
            Готово {relTime(new Date(task.doneAt))} · перевірив(ла) {shortName(memberName(task.reviewerId))}
          </span>
        ) : (
          <>
            <span className="truncate">{shortName(memberName(task.ownerId))}</span>
            {task.dueDate && <span className={overdue ? "text-danger" : ""}>· {fmtDay(task.dueDate)}</span>}
          </>
        )}
        {task.linkCount > 0 && (
          <span className="ml-auto shrink-0" title="Посилання">
            🔗 {task.linkCount}
          </span>
        )}
      </div>
    </button>
  );
}
