"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { pickMember } from "@/app/actions/member";

export function MemberPicker({ members }: { members: { id: number; name: string; isLead: boolean }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-1 text-text2">Спринт фінального проєкту</div>
        <h1 className="page-title mb-6">Хто ви?</h1>
        {members.length === 0 ? (
          <p className="text-text3">Учасників ще немає. Запустіть `npm run db:seed`.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {members.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await pickMember(m.id);
                      router.refresh();
                    })
                  }
                  className="card card-hover flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <Avatar name={m.name} />
                  <span className="flex-1">{m.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-text3">
          Вибір збережеться в цьому браузері. Змінити можна будь-коли через «Змінити» внизу бічної панелі.
        </p>
      </div>
    </main>
  );
}

const AVATAR_COLORS = ["blue", "green", "purple", "orange", "pink", "brown", "yellow", "red"];

export function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      aria-hidden
      className={`tag-${color} inline-flex shrink-0 items-center justify-center rounded-full font-medium`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {name[0]}
    </span>
  );
}
