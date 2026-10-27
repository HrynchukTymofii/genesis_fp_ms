import { addDays, differenceInCalendarDays, formatDistanceToNow, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { uk } from "date-fns/locale";

export const TZ = "Europe/Kyiv";
export const SPRINT_START = "2026-10-27";
export const SPRINT_END = "2026-11-16";
export const PITCH_AT = fromZonedTime("2026-11-16T18:00:00", TZ);

/** Today's date in Kyiv as yyyy-MM-dd. */
export function kyivToday(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Kyiv wall-clock string ("2026-10-27T19:30") to a UTC Date. */
export function kyivToUtc(local: string): Date {
  return fromZonedTime(local, TZ);
}

/** UTC Date to the Kyiv wall-clock value used by <input type="datetime-local">. */
export function utcToKyivInput(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm");
}

// Pure calendar arithmetic on yyyy-MM-dd strings (UTC noon avoids DST edges).
const toUtcNoon = (day: string) => new Date(`${day}T12:00:00Z`);

export function addDaysStr(day: string, n: number): string {
  return addDays(toUtcNoon(day), n).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

export function daysToPitch(today = kyivToday()): number {
  return Math.max(0, daysBetween(today, SPRINT_END));
}

/** Monday..Sunday of the week that contains `day`. */
export function weekRange(day = kyivToday()): [string, string] {
  const dow = (toUtcNoon(day).getUTCDay() + 6) % 7; // 0 = Monday
  const start = addDaysStr(day, -dow);
  return [start, addDaysStr(start, 6)];
}

export function sprintDays(): string[] {
  const out: string[] = [];
  for (let d = SPRINT_START; d <= SPRINT_END; d = addDaysStr(d, 1)) out.push(d);
  return out;
}

/** "27 жовт." */
export function fmtDay(day: string): string {
  return formatInTimeZone(toUtcNoon(day), "UTC", "d MMM", { locale: uk });
}

/** "вт, 27 жовтня" */
export function fmtDayLong(day: string): string {
  return formatInTimeZone(toUtcNoon(day), "UTC", "EEEEEE, d MMMM", { locale: uk });
}

/** "вт, 27 жовт., 19:30" in Kyiv time. */
export function fmtDateTime(d: Date): string {
  return formatInTimeZone(d, TZ, "EEEEEE, d MMM, HH:mm", { locale: uk });
}

export function fmtTime(d: Date): string {
  return formatInTimeZone(d, TZ, "HH:mm");
}

export function kyivDateOf(d: Date): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** "5 хвилин тому" */
export function relTime(d: Date): string {
  return formatDistanceToNow(d, { addSuffix: true, locale: uk });
}

/** Current time in ms. Server pages render per request, so reading the clock is intended. */
export function nowMs(): number {
  return Date.now();
}
