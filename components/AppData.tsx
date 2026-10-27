"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AppMember = { id: number; name: string; isLead: boolean };
export type AppDirection = {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  ownerId: number | null;
  reviewerId: number | null;
};
export type AppData = {
  me: AppMember;
  members: AppMember[];
  directions: AppDirection[];
  blobEnabled: boolean;
};

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ value, children }: { value: AppData; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppDataProvider missing");
  const memberName = (id: number | null | undefined) =>
    id == null ? null : (v.members.find((m) => m.id === id)?.name ?? null);
  const direction = (slug: string) => v.directions.find((d) => d.slug === slug);
  return { ...v, memberName, direction };
}
