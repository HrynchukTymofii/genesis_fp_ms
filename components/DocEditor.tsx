"use client";

import dynamic from "next/dynamic";

// BlockNote only runs in the browser.
export const DocEditor = dynamic(() => import("./DocEditorInner"), {
  ssr: false,
  loading: () => <div className="min-h-24 py-1 text-text3">Завантаження редактора…</div>,
});
