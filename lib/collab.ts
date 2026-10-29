// Shared-editing helpers, usable from client and server code.

/** Every Liveblocks room of this app starts with this, e.g. "sprint:meeting:12". */
export const ROOM_PREFIX = "sprint:";

/** Set at build time from LIVEBLOCKS_SECRET_KEY (see next.config.ts). */
export const COLLAB_ENABLED = process.env.NEXT_PUBLIC_COLLAB === "1";

export function roomId(kind: "meeting" | "task" | "direction", id: number | string): string {
  return `${ROOM_PREFIX}${kind}:${id}`;
}

const CURSOR_COLORS = ["#e5484d", "#f76b15", "#ffc53d", "#30a46c", "#12a594", "#0090ff", "#8e4ec6", "#d6409f"];

/** Stable cursor color per member. */
export function cursorColor(userId: string | undefined): string {
  let h = 0;
  for (const c of userId ?? "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
}
