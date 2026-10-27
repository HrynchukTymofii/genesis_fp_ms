"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { unlock } from "@/app/actions/member";

export default function UnlockPage() {
  const [state, action, pending] = useActionState(unlock, {});
  const next = useSearchParams().get("next") ?? "/";
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <form action={action} className="w-full max-w-sm">
        <input type="hidden" name="next" value={next} />
        <div className="mb-1 text-text2">Спринт фінального проєкту</div>
        <h1 className="page-title mb-6">Код команди</h1>
        <label className="flex flex-col gap-1">
          <span className="text-text2">Введіть спільний код команди</span>
          <input name="passcode" type="password" autoFocus required className="input" autoComplete="current-password" />
        </label>
        {state?.error && <p className="mt-2 text-danger" role="alert">{state.error}</p>}
        <button className="btn btn-primary mt-4" disabled={pending}>
          {pending ? "Перевіряю…" : "Увійти"}
        </button>
      </form>
    </main>
  );
}
