"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDirectionNotes, setDirectionRoles } from "@/app/actions/directions";
import { createTask } from "@/app/actions/tasks";
import { useAppData } from "@/components/AppData";
import { DocEditor } from "@/components/DocEditor";
import { roomId } from "@/lib/collab";

export function DirectionRoles({
  slug,
  ownerId,
  reviewerId,
}: {
  slug: string;
  ownerId: number | null;
  reviewerId: number | null;
}) {
  const { me, members, memberName } = useAppData();
  const router = useRouter();
  const [, start] = useTransition();

  if (!me.isLead) {
    return (
      <>
        <Row label="Власник">{memberName(ownerId) ?? <span className="text-text3">не призначено</span>}</Row>
        <Row label="Рецензент">{memberName(reviewerId) ?? <span className="text-text3">не призначено</span>}</Row>
      </>
    );
  }
  const select = (value: number | null, key: "ownerId" | "reviewerId", label: string) => (
    <select
      aria-label={label}
      className="input-bare h-[30px] w-auto min-w-48"
      value={value ?? ""}
      onChange={(e) =>
        start(async () => {
          await setDirectionRoles(slug, { [key]: e.target.value ? Number(e.target.value) : null });
          router.refresh();
        })
      }
    >
      <option value="">— не призначено —</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
  return (
    <>
      <Row label="Власник">{select(ownerId, "ownerId", "Власник")}</Row>
      <Row label="Рецензент">{select(reviewerId, "reviewerId", "Рецензент")}</Row>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="prop">
      <div className="prop-label">{label}</div>
      <div className="prop-value flex min-h-[30px] items-center">{children}</div>
    </div>
  );
}

export function InlineAddTask({ slug }: { slug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        start(async () => {
          await createTask({ title, directionSlug: slug, dueDate: due || null });
          setTitle("");
          setDue("");
          router.refresh();
        });
      }}
    >
      <span aria-hidden className="text-text3">+</span>
      <input
        className="input-bare min-w-0 flex-1"
        placeholder="Додати задачу…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Назва нової задачі"
      />
      <input
        type="date"
        className="input-bare w-auto text-text2"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        aria-label="Дедлайн нової задачі"
      />
      {title.trim() && (
        <button className="btn h-7" disabled={pending}>
          Додати
        </button>
      )}
    </form>
  );
}

export function DirectionNotes({ slug, notes }: { slug: string; notes: unknown }) {
  return (
    <DocEditor
      room={roomId("direction", slug)}
      initialContent={notes}
      onSave={(doc) => saveDirectionNotes(slug, doc)}
      placeholder="Спільні нотатки напряму: джерела, рішення, чернетки. Наберіть «/» для блоків."
    />
  );
}
