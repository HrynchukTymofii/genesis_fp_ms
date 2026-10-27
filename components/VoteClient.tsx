"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveVote, setNicheActive } from "@/app/actions/votes";
import { VOTE_CRITERIA, type VoteKey } from "@/lib/labels";
import { useToast } from "@/components/Toast";

type Scores = Record<VoteKey, number>;

export function VoteCard({ nicheId, initial }: { nicheId: number; initial: Partial<Scores> | null }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState<Partial<Scores>>(initial ?? {});
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const complete = VOTE_CRITERIA.every((c) => s[c.key]);

  return (
    <div className="flex flex-col gap-2">
      {VOTE_CRITERIA.map((c) => (
        <div key={c.key} className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto]">
          <span className="text-text2">{c.label}</span>
          <div className="flex gap-1" role="radiogroup" aria-label={c.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={s[c.key] === n}
                onClick={() => {
                  setS((x) => ({ ...x, [c.key]: n }));
                  setDirty(true);
                }}
                className={`size-8 rounded border text-sm ${s[c.key] === n ? "border-accent bg-accent text-white" : "border-border hover:bg-hover"}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!complete || pending || !dirty}
          onClick={() =>
            start(async () => {
              await saveVote(nicheId, s as Scores);
              setDirty(false);
              toast("Голос збережено.");
              router.refresh();
            })
          }
        >
          {initial && !dirty ? "Голос збережено" : pending ? "Зберігаю…" : "Зберегти голос"}
        </button>
        {!complete && <span className="text-xs text-text3">Оцініть усі п’ять критеріїв</span>}
      </div>
    </div>
  );
}

export function NicheActiveToggle({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-ghost h-6 px-2 text-xs"
      onClick={() =>
        start(async () => {
          await setNicheActive(id, !active);
          router.refresh();
        })
      }
    >
      {active ? "Зробити неактивною" : "Повернути"}
    </button>
  );
}
