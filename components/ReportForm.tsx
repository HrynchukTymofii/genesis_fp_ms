"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitReport, type ReportState } from "@/app/actions/reports";
import { REPORT_STATUSES, REPORT_STATUS_LABEL } from "@/lib/labels";
import { useToast } from "@/components/Toast";

type Existing = { done: string; next: string; blockers: string; status: string } | null;

export function ReportForm({ existing }: { existing: Existing }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, {});
  const toast = useToast();
  const last = useRef(state);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.ok) toast(existing ? "Звіт оновлено." : "Звіт опубліковано.");
  }, [state, toast, existing]);

  return (
    <form action={action} className="card flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">{existing ? "Мій звіт за сьогодні" : "Написати звіт за сьогодні"}</h2>
        {existing && <span className="text-xs text-text3">Повторна відправка оновить звіт</span>}
      </div>
      <Field name="done" label="Що зроблено" defaultValue={existing?.done} required placeholder="Провела 2 інтерв’ю, оновила синтез…" />
      <Field name="next" label="Що далі" defaultValue={existing?.next} required placeholder="Завтра — скрипт для юзабіліті…" />
      <Field name="blockers" label="Блокери (необов’язково)" defaultValue={existing?.blockers} placeholder="Чекаю на дані від…" />
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1 text-text2">Статус</legend>
        {REPORT_STATUSES.map((s) => (
          <label key={s} className="pill cursor-pointer has-[:checked]:border-transparent has-[:checked]:bg-[var(--tag-blue-bg)] has-[:checked]:text-[var(--tag-blue)]">
            <input
              type="radio"
              name="status"
              value={s}
              defaultChecked={(existing?.status ?? "on_track") === s}
              className="sr-only"
            />
            {REPORT_STATUS_LABEL[s]}
          </label>
        ))}
      </fieldset>
      {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      <div>
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Зберігаю…" : existing ? "Оновити звіт" : "Опублікувати звіт"}
        </button>
      </div>
    </form>
  );
}

function Field(props: { name: string; label: string; defaultValue?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-text2">{props.label}</span>
      <textarea
        name={props.name}
        rows={2}
        defaultValue={props.defaultValue}
        required={props.required}
        placeholder={props.placeholder}
        className="input field-sizing-content min-h-[52px]"
      />
    </label>
  );
}
