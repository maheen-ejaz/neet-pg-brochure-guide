import { Link } from "react-router-dom";
import { findSchedule } from "../../data/schedules";
import type { ScheduleRef } from "../../schema/stateBrochure";
import { scheduleDocs, stageWhen } from "../schedule";
import { DeadlineBadge } from "./DeadlineBadge";
import { Cite, SourceDocsContext } from "./ui";

/**
 * Under a state rule that depends on MCC rounds: the matching MCC dates, cited to the MCC schedule.
 * Renders nothing when that schedule isn't in this build (e.g. a draft in a production build).
 */
export function ScheduleRefs({ refs }: { refs?: ScheduleRef[] }) {
  if (!refs?.length) return null;
  const rows = refs.flatMap((ref) => {
    const entry = findSchedule(ref.key);
    const round = entry?.schedule.rounds.find((r) => r.round === ref.round);
    if (!entry || !round) return [];
    const stages = ref.stages.map((k) => round.stages.find((s) => s.key === k)).filter((s) => s !== undefined);
    return [{ entry, round, stages }];
  });
  if (rows.length === 0) return null;
  const { entry } = rows[0];
  return (
    <SourceDocsContext.Provider value={scheduleDocs(entry.schedule)}>
      <div className="mt-3 rounded-md border border-line bg-canvas px-3 py-2 text-[13px]">
        <p className="font-semibold text-ink">
          MCC All India Quota dates, {entry.schedule.meta.documentDate.slice(0, 4)}{entry.schedule.meta.tentative ? " (tentative)" : ""}
        </p>
        <p className="text-soft">For NEET-PG. This MCC schedule doesn't mention MDS, so MDS candidates shouldn't rely on these dates.</p>
        <ul className="mt-1.5 space-y-1">
          {rows.flatMap(({ round, stages }) =>
            stages.map((s) => (
              <li key={round.id + s.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-ink">{round.name.replace("Online stray vacancy round", "Stray round")}, {s.label.toLowerCase()}:</span>
                {/* Keep each date on one line; a range may wrap at its dash. */}
                <span>{stageWhen(s, true).replace(/(\d+(?:st|nd|rd|th)) (\w+)/g, "$1\u00a0$2")}</span>
                <DeadlineBadge date={s.end ?? s.start} time={s.endTime} kind={s.key === "result" ? "event" : "deadline"} />
                <Cite pages={round.sourcePages} />
              </li>
            )),
          )}
        </ul>
        <Link to={`/mcc/${entry.key}`} className="mt-1 inline-block text-brand-strong hover:underline">Full MCC timeline →</Link>
      </div>
    </SourceDocsContext.Provider>
  );
}
