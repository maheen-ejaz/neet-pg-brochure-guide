import { useState } from "react";
import type { ScheduleRound, ScheduleStage } from "../../schema/nationalSchedule";
import { CANDIDATE_STAGES, stageStatus } from "../schedule";
import { formatDate, formatDateShort, sharedYear } from "../text";
import { DeadlineBadge } from "./DeadlineBadge";
import { Cite } from "./ui";

/**
 * One round as an aligned table: step | opens | closes. Candidate steps only; college/MCC steps
 * fold into a muted line. The open step is highlighted, past steps fade with a tick, and urgency
 * badges sit next to the step name. On phones each row becomes a small card.
 */
export const COLS = "sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]";

export function When({ date, time, short, label }: { date?: string; time?: string; short: boolean; label: string }) {
  if (!date) return <span className="hidden sm:block" />;
  return (
    <span className="flex items-baseline gap-2 sm:block">
      <span className="w-14 shrink-0 text-xs text-soft sm:hidden">{label}</span>
      <span>
        <span className="block whitespace-nowrap text-ink">{short ? formatDateShort(date) : formatDate(date)}</span>
        {time && <span className="block text-xs text-soft">{time}</span>}
      </span>
    </span>
  );
}

/** Where each stage's dates go: ranges and same-day windows use both columns, a deadline goes under Closes, a plain date is "On". */
function slots(st: ScheduleStage) {
  const range = !!st.end && st.end !== st.start;
  if (range || (st.startTime && st.endTime)) {
    return { opens: { date: st.start, time: st.startTime }, closes: { date: st.end ?? st.start, time: st.endTime } };
  }
  // A single date with only a closing time is a deadline: it goes under "Closes".
  if (st.endTime && !st.startTime) return { opens: undefined, closes: { date: st.start, time: st.endTime } };
  return { on: { date: st.start, time: st.startTime } };
}

function Row({ st, today, short, college }: { st: ScheduleStage; today: string; short: boolean; college?: boolean }) {
  const status = stageStatus(st, today);
  const s = slots(st);
  const done = status === "done";
  const now = status === "now" && !college;
  return (
    <li className={`grid gap-1.5 px-3 py-2.5 sm:items-center sm:gap-3 ${COLS} ${now ? "bg-good-tint/60" : ""} ${college ? "bg-canvas/60 text-soft" : ""} ${done ? "opacity-60" : ""}`}>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span aria-hidden className={`w-3 text-center text-xs ${now ? "text-good" : "text-soft"}`}>{done ? "✓" : now ? "●" : ""}</span>
        <span className={college ? "text-sm" : "font-medium text-ink"}>{st.label}</span>
        {now && <span className="rounded-md bg-good-tint px-1.5 py-0.5 text-[11px] font-semibold text-good">Open now</span>}
        {!college && <DeadlineBadge date={st.end ?? st.start} time={st.endTime} kind={st.key === "result" ? "event" : "deadline"} />}
      </span>
      {"on" in s && s.on ? (
        <span className="sm:col-span-2"><When date={s.on.date} time={s.on.time} short={short} label="On" /></span>
      ) : (
        <>
          <When date={s.opens?.date} time={s.opens?.time} short={short} label="Opens" />
          <When date={s.closes?.date} time={s.closes?.time} short={short} label="Closes" />
        </>
      )}
    </li>
  );
}

export function RoundTable({ round, today }: { round: ScheduleRound; today: string }) {
  const [showCollege, setShowCollege] = useState(false);
  const candidate = round.stages.filter((s) => CANDIDATE_STAGES.includes(s.key));
  const college = round.stages.filter((s) => !CANDIDATE_STAGES.includes(s.key));
  const year = sharedYear(round.stages.flatMap((s) => [s.start, s.end]));
  const short = year !== null;
  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className={`hidden border-b border-line bg-canvas px-3 py-2 text-xs font-semibold text-soft sm:grid sm:gap-3 ${COLS}`}>
          <span className="pl-5">Step{year ? ` · ${year}` : ""}</span>
          <span>Opens</span>
          <span>Closes</span>
        </div>
        <ol className="divide-y divide-line text-sm">
          {candidate.map((st) => <Row key={st.key} st={st} today={today} short={short} />)}
          {showCollege && college.map((st) => <Row key={st.key} st={st} today={today} short={short} college />)}
        </ol>
      </div>
      {college.length > 0 && (
        <p className="mt-2 text-xs text-soft">
          {!showCollege && (
            <>College &amp; MCC steps: {college.map((st, i) => (
              <span key={st.key}>{i > 0 && " · "}{st.label.replace(/ by colleges.*$| verified by colleges.*$/i, "")} {st.end && st.end !== st.start ? `${formatDateShort(st.start)} - ${formatDateShort(st.end)}` : formatDateShort(st.start)}</span>
            ))}{" "}</>
          )}
          <button type="button" onClick={() => setShowCollege(!showCollege)} className="font-medium text-brand-strong hover:underline" aria-expanded={showCollege}>
            {showCollege ? "Hide college steps" : "Show"}
          </button>
          <span className="ml-2">Source<Cite pages={round.sourcePages} /></span>
        </p>
      )}
    </div>
  );
}
