"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Main content column: 1100px left-aligned, except task pages, which use the full width. */
export function PageContainer({ children }: { children: ReactNode }) {
  const full = usePathname().startsWith("/tasks/");
  return (
    <div
      className={`mx-auto w-full px-4 pb-24 pt-8 sm:px-8 md:ml-0 md:px-12 md:pt-12 lg:px-16 ${
        full ? "max-w-none" : "max-w-[1100px]"
      }`}
    >
      {children}
    </div>
  );
}
