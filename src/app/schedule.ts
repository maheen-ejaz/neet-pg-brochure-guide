import type { Schedule, ScheduleRound, ScheduleStage } from "../schema/nationalSchedule";
import type { StageKey } from "../schema/schedule-keys";
import { formatDate } from "./text";

/** Citations on schedule content read "MCC schedule p. N". */
export const scheduleDocs = (s: Schedule) => [{ title: "MCC schedule", startPage: 1, pageCount: s.source.pageCount }];

/** Stages that ask something of candidates (the rest are for colleges or MCC). */
export const CANDIDATE_STAGES: StageKey[] = ["registration", "payment", "choiceFilling", "choiceLocking", "result", "reporting"];

/** "12-10-2026 – 21-10-2026, until 12:00 noon"; same day with both times: "21-12-2026, 4:00 PM – 11:55 PM". */
export function stageWhen(s: ScheduleStage): string {
  if ((!s.end || s.end === s.start) && s.startTime && s.endTime) return `${formatDate(s.start)}, ${s.startTime} – ${s.endTime}`;
  const start = formatDate(s.start) + (s.startTime && s.end && s.end !== s.start ? ` (from ${s.startTime})` : "");
  const end = s.end && s.end !== s.start ? ` – ${formatDate(s.end)}` : "";
  const time = s.endTime ? `, until ${s.endTime}` : s.startTime && (!s.end || s.end === s.start) ? `, from ${s.startTime}` : "";
  return start + end + time;
}

export type StageStatus = "done" | "now" | "upcoming";

/** By calendar day. A stage is "now" on every day from its start to its end, inclusive. */
export function stageStatus(s: ScheduleStage, today: string): StageStatus {
  const end = s.end ?? s.start;
  if (today > end) return "done";
  if (today >= s.start) return "now";
  return "upcoming";
}

const DEADLINE_WORD: Partial<Record<StageKey, string>> = {
  registration: "registration closes",
  payment: "payment closes",
  choiceFilling: "choice filling closes",
  choiceLocking: "choice locking closes",
  result: "result",
  reporting: "reporting closes",
};

export interface Deadline {
  round: ScheduleRound;
  stage: ScheduleStage;
  date: string;
  time?: string;
  label: string;
}

/**
 * The next candidate deadline after now, or null once the schedule is over. `nowMinutes` is the
 * time of day (MCC times are server time, i.e. IST); a deadline without a time lasts all day.
 */
export function nextDeadline(schedule: Schedule, today: string, nowMinutes = 0): Deadline | null {
  const all: Deadline[] = schedule.rounds.flatMap((round) =>
    round.stages
      .filter((s) => CANDIDATE_STAGES.includes(s.key))
      .map((stage) => ({
        round,
        stage,
        date: stage.end ?? stage.start,
        time: stage.endTime,
        label: `${round.name}: ${DEADLINE_WORD[stage.key] ?? stage.label}`,
      })),
  );
  const order = (d: Deadline) => `${d.date} ${toMinutes(d.time).toString().padStart(4, "0")}`;
  return (
    all
      .filter((d) => d.date > today || (d.date === today && toMinutes(d.time) > nowMinutes))
      .sort((a, b) => order(a).localeCompare(order(b)))[0] ?? null
  );
}

/** "12:00 noon" → 720, "3:00 PM" → 900, "11:55 PM" → 1435; no time sorts to end of day. */
function toMinutes(time?: string): number {
  if (!time) return 24 * 60;
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM|noon)?/i.exec(time);
  if (!m) return 24 * 60;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3] ?? "")) h += 12;
  if (/noon/i.test(m[3] ?? "")) h = 12;
  return h * 60 + Number(m[2]);
}

/**
 * MCC times are "as per server time", i.e. Indian Standard Time. "Today" and "now" are therefore
 * taken in Asia/Kolkata, whatever the viewer's own time zone.
 */
function istParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Minutes since midnight IST, for comparing with deadline times. */
export const minutesNow = (now = new Date()) => istParts(now).minutes;

/** Today's date (YYYY-MM-DD) in IST. */
export const todayIso = (now = new Date()) => istParts(now).date;
