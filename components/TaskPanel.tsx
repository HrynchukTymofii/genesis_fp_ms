"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { TaskView, NewTaskForm, type NewTaskDefaults } from "@/components/TaskView";

type PanelState = { kind: "task"; id: number } | { kind: "new"; defaults: NewTaskDefaults } | null;

const Ctx = createContext<{ open: (id: number) => void; openNew: (d?: NewTaskDefaults) => void; close: () => void }>({
  open: () => {},
  openNew: () => {},
  close: () => {},
});

export const useTaskPanel = () => useContext(Ctx);

export function TaskPanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PanelState>(null);
  const open = useCallback((id: number) => setState({ kind: "task", id }), []);
  const openNew = useCallback((defaults: NewTaskDefaults = {}) => setState({ kind: "new", defaults }), []);
  const close = useCallback(() => setState(null), []);

  return (
    <Ctx.Provider value={{ open, openNew, close }}>
      {children}
      {state && (
        <Drawer onClose={close} openHref={state.kind === "task" ? `/tasks/${state.id}` : null}>
          {state.kind === "task" ? (
            <TaskView key={state.id} taskId={state.id} onDeleted={close} />
          ) : (
            <NewTaskForm defaults={state.defaults} onCreated={(id) => open(id)} />
          )}
        </Drawer>
      )}
    </Ctx.Provider>
  );
}

function Drawer({ children, onClose, openHref }: { children: ReactNode; onClose: () => void; openHref: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/10" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Задача"
        className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[560px] flex-col border-l border-border bg-bg shadow-[-4px_0_16px_rgba(15,15,15,0.08)] outline-none"
      >
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
          <button type="button" className="btn btn-ghost px-2" onClick={onClose} aria-label="Закрити">
            ✕
          </button>
          {openHref && (
            <Link href={openHref} className="btn btn-ghost" onClick={onClose}>
              ↗ Відкрити як сторінку
            </Link>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-16 pt-6 sm:px-10">{children}</div>
      </div>
    </>
  );
}
