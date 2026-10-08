import { minutesNow, todayIso, toMinutes } from "./schedule";

/**
 * Urgency badges for dates within the next 3 days, in IST (all documents use Indian time).
 * 3 → "3 Days Remaining" … 0 → "Last Day Today" with an HH:MM countdown to the printed time,
 * or to 11:59 PM when no time is printed. Events that aren't deadlines (a result day, a window
 * that opens) say "Today" and have no countdown. Past dates get no badge.
 */
export type Urgency = 3 | 2 | 1 | 0;
export type DateKind = "deadline" | "event";

export interface Badge {
  level: Urgency;
  label: string;
  /** "05:42" — hours and minutes left today; only on a deadline's last day. */
  countdown?: string;
  /** True when the countdown runs to end of day because no time is printed. */
  endOfDay?: boolean;
}

const END_OF_DAY = 23 * 60 + 59;

/** Whole days from one ISO date to another (calendar days, no time zones involved). */
export function daysBetween(fromIso: string, toIso: string): number {
  const utc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((utc(toIso) - utc(fromIso)) / 86_400_000);
}

export function badgeFor(date: string, time: string | undefined, kind: DateKind, now = new Date()): Badge | null {
  const days = daysBetween(todayIso(now), date);
  if (days < 0 || days > 3) return null;
  if (days > 0) return { level: days as Urgency, label: `${days} ${days === 1 ? "Day" : "Days"} Remaining` };
  if (kind === "event") return { level: 0, label: "Today" };
  const closes = time ? toMinutes(time) : END_OF_DAY;
  const left = closes - minutesNow(now);
  if (left <= 0) return null; // closed earlier today
  const hh = String(Math.floor(left / 60)).padStart(2, "0");
  const mm = String(left % 60).padStart(2, "0");
  return { level: 0, label: "Last Day Today", countdown: `${hh}:${mm}`, endOfDay: !time };
}

/** Dates whose label says something opens or becomes available are events, not deadlines. */
export const kindFromLabel = (label: string): DateKind => (/\b(opens?|begins?|starts?|downloadable|available|result)\b/i.test(label) ? "event" : "deadline");

/** "until 3:00 PM", "(until 12:00 noon)" in a label → the printed closing time. */
export function timeFromLabel(label: string): string | undefined {
  return /until\s+(\d{1,2}:\d{2}\s*(?:AM|PM|noon))/i.exec(label)?.[1];
}
