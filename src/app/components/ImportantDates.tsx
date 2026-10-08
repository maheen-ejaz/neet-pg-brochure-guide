import type { Brochure } from "../../schema/stateBrochure";
import { kindFromLabel, timeFromLabel } from "../deadline";
import { sharedYear } from "../text";
import { DeadlineBadge } from "./DeadlineBadge";
import { COLS, When } from "./RoundTable";
import { Cite } from "./ui";
import { SeatChip } from "../seats";

/** A state's important dates as the same Step | Opens | Closes table as the MCC rounds. */
export function ImportantDates({ dates }: { dates: Brochure["importantDates"] }) {
  const year = sharedYear(dates.flatMap((d) => [d.date, d.endDate]));
  const short = year !== null;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className={`hidden border-b border-line bg-canvas px-3 py-2 text-xs font-semibold text-soft sm:grid sm:gap-3 ${COLS}`}>
        <span>Date{year ? ` · ${year}` : ""}</span>
        <span>Opens</span>
        <span>Closes</span>
      </div>
      <ol className="divide-y divide-line text-sm">
        {dates.map((d) => {
          const time = d.endTime ?? timeFromLabel(d.label);
          const range = !!d.endDate && d.endDate !== d.date;
          return (
            <li key={d.id} className={`grid gap-1.5 px-3 py-2.5 sm:items-center sm:gap-3 ${COLS}`}>
              <span className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-ink">{d.label}</span>
                  <SeatChip seats={d.seats} />
                  <DeadlineBadge date={d.endDate ?? d.date} time={time} kind={kindFromLabel(d.label)} />
                </span>
                {d.detail && <span className="text-xs text-soft">{d.detail}</span>}
                <span className="text-xs"><Cite pages={d.sourcePages} /></span>
              </span>
              {range ? (
                <>
                  <When date={d.date} short={short} label="Opens" />
                  <When date={d.endDate} time={time} short={short} label="Closes" />
                </>
              ) : kindFromLabel(d.label) === "deadline" ? (
                <>
                  <span className="hidden sm:block" />
                  <When date={d.date} time={time} short={short} label="By" />
                </>
              ) : (
                <span className="sm:col-span-2"><When date={d.date} time={time} short={short} label="From" /></span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
