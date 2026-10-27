"use client";

import { useTaskPanel } from "@/components/TaskPanel";
import type { NewTaskDefaults } from "@/components/TaskView";

export function NewTaskButton({ defaults = {}, label = "+ Нова задача" }: { defaults?: NewTaskDefaults; label?: string }) {
  const { openNew } = useTaskPanel();
  return (
    <button type="button" className="btn btn-primary" onClick={() => openNew(defaults)}>
      {label}
    </button>
  );
}

export function OpenTaskButton({ id, children, className }: { id: number; children: React.ReactNode; className?: string }) {
  const { open } = useTaskPanel();
  return (
    <button type="button" className={className} onClick={() => open(id)}>
      {children}
    </button>
  );
}
