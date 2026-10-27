"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setTheme, switchMember } from "@/app/actions/member";
import { useAppData } from "@/components/AppData";
import { Avatar } from "@/components/MemberPicker";

const PAGES_TOP = [
  { href: "/", label: "Головна", emoji: "🏠" },
  { href: "/board", label: "Дошка", emoji: "🗂" },
];
const PAGES_BOTTOM = [
  { href: "/roadmap", label: "Roadmap", emoji: "🗺" },
  { href: "/reports", label: "Звіти", emoji: "📝" },
  { href: "/meetings", label: "Зустрічі", emoji: "📅" },
  { href: "/resources", label: "Ресурси", emoji: "📚" },
  { href: "/form", label: "Анкета команди", emoji: "📋" },
  { href: "/roles", label: "Ролі", emoji: "🧩", leadOnly: true },
  // Hidden for now; the page still works at /vote. Uncomment to show it again.
  // { href: "/vote", label: "Голосування за ідею", emoji: "🗳" },
];

type Theme = "light" | "dark" | "system";

export function Sidebar({ theme }: { theme: Theme }) {
  const { me, directions } = useAppData();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dirsOpen, setDirsOpen] = useState(true);
  const [themeState, setThemeState] = useState<Theme>(theme);
  const [, start] = useTransition();

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const cycleTheme = () => {
    const next: Theme = themeState === "system" ? "dark" : themeState === "dark" ? "light" : "system";
    setThemeState(next);
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    void setTheme(next);
  };

  const item = (p: { href: string; label: string; emoji: string }, indent = false) => (
    <Link
      key={p.href}
      href={p.href}
      aria-current={isActive(p.href) ? "page" : undefined}
      className={`flex h-[30px] items-center gap-2 rounded px-2 text-text2 hover:bg-hover ${
        indent ? "pl-7" : ""
      } ${isActive(p.href) ? "bg-selected font-medium text-text" : ""}`}
    >
      <span aria-hidden className="w-5 text-center">{p.emoji}</span>
      <span className="truncate">{p.label}</span>
    </Link>
  );

  const nav = (
    <nav aria-label="Сторінки" className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-2">
      {PAGES_TOP.map((p) => item(p))}
      <button
        type="button"
        onClick={() => setDirsOpen((v) => !v)}
        aria-expanded={dirsOpen}
        className="flex h-[30px] items-center gap-2 rounded px-2 text-left text-text2 hover:bg-hover"
      >
        <span aria-hidden className="w-5 text-center">🧭</span>
        <span className="flex-1">Напрями</span>
        <span aria-hidden className={`text-xs text-text3 transition-transform ${dirsOpen ? "rotate-90" : ""}`}>▶</span>
      </button>
      {dirsOpen &&
        directions.map((d) => item({ href: `/directions/${d.slug}`, label: d.name, emoji: d.emoji }, true))}
      {PAGES_BOTTOM.filter((p) => !("leadOnly" in p) || me.isLead).map((p) => item(p))}
    </nav>
  );

  const footer = (
    <div className="border-t border-border px-2 py-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <Avatar name={me.name} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{me.name}</div>
        </div>
        <button
          type="button"
          className="text-xs text-text2 underline-offset-2 hover:underline"
          onClick={() =>
            start(async () => {
              await switchMember();
              router.refresh();
            })
          }
        >
          Змінити
        </button>
      </div>
      <button
        type="button"
        onClick={cycleTheme}
        className="mt-1 flex h-[28px] w-full items-center gap-2 rounded px-2 text-left text-xs text-text2 hover:bg-hover"
      >
        <span aria-hidden className="w-5 text-center">{themeState === "dark" ? "🌙" : themeState === "light" ? "☀️" : "🖥"}</span>
        Тема: {themeState === "dark" ? "темна" : themeState === "light" ? "світла" : "як у системі"}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-12 items-center gap-2 border-b border-border bg-sidebar px-3 md:hidden">
        <button
          type="button"
          aria-label="Меню"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="btn btn-ghost px-2 text-lg"
        >
          ☰
        </button>
        <span className="truncate font-medium">Спринт фінального проєкту</span>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-sidebar transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0 md:border-r md:border-border ${
          open ? "translate-x-0 shadow-xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-12 items-center gap-2 px-4 font-medium">
          <span aria-hidden className="tag-gray inline-flex size-5 items-center justify-center rounded text-xs">S</span>
          <span className="truncate">Спринт фінального проєкту</span>
        </div>
        {nav}
        {footer}
      </aside>
    </>
  );
}
