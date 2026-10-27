// Shared-passcode helpers, usable from proxy.ts and from server code.
export const UNLOCK_COOKIE = "sprint_unlock";

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`team-sprint-hub:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Only allow redirects to paths inside this site ("/form", not "//evil.com"). */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/unlock")
    ? next
    : "/";
}

/** True when no passcode is configured, or the cookie carries the right token. */
export async function isUnlocked(cookieValue: string | undefined): Promise<boolean> {
  const passcode = process.env.TEAM_PASSCODE;
  if (!passcode) return true;
  return cookieValue === (await passcodeToken(passcode));
}
