import { Link } from "react-router-dom";
import { findSchedule } from "../../data/schedules";
import type { ScheduleRef } from "../../schema/stateBrochure";
import { scheduleDocs, stageWhen } from "../schedule";
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
          MCC All India Quota dates{entry.schedule.meta.tentative ? " (tentative)" : ""}
        </p>
        <p className="text-soft">For NEET-PG. This MCC schedule doesn't mention MDS, so MDS candidates shouldn't rely on these dates.</p>
        <ul className="mt-1 space-y-0.5">
          {rows.map(({ round, stages }) => (
            <li key={round.id}>
              <span className="font-medium text-ink">{round.name}:</span>{" "}
              {stages.map((s, i) => (
                <span key={s.key}>{i > 0 && " · "}{s.label} {stageWhen(s)}</span>
              ))}
              <Cite pages={round.sourcePages} />
            </li>
          ))}
        </ul>
        <Link to={`/mcc/${entry.key}`} className="mt-1 inline-block text-brand-strong hover:underline">Full MCC timeline →</Link>
      </div>
    </SourceDocsContext.Provider>
  );
}
