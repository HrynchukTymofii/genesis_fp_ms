"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDirectionRoles } from "@/app/actions/directions";
import { applySuggestion, toggleSuggestionSwap } from "@/app/actions/roles";
import { useAppData } from "@/components/AppData";
import { useToast } from "@/components/Toast";

export function ApplySuggestionButton() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Записати запропонованих власників і рецензентів у всі напрями?")) return;
        start(async () => {
          await applySuggestion();
          toast("Ролі оновлено.");
          router.refresh();
        });
      }}
    >
      {pending ? "Застосовую…" : "Застосувати пропозицію"}
    </button>
  );
}

export function SwapButton({ slug, swapped }: { slug: string; swapped: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={swapped}
      title="Поміняти місцями власника й рецензента в пропозиції"
      className="pill h-7 px-2"
      data-active={swapped}
      onClick={() =>
        start(async () => {
          await toggleSuggestionSwap(slug);
          router.refresh();
        })
      }
    >
      ⇄
    </button>
  );
}

export function RoleSelect({ slug, field, value }: { slug: string; field: "ownerId" | "reviewerId"; value: number | null }) {
  const { members } = useAppData();
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <select
      aria-label={field === "ownerId" ? "Власник" : "Рецензент"}
      className="input h-8 py-0"
      value={value ?? ""}
      onChange={(e) =>
        start(async () => {
          await setDirectionRoles(slug, { [field]: e.target.value ? Number(e.target.value) : null });
          router.refresh();
        })
      }
    >
      <option value="">—</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
