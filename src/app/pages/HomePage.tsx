import { Link } from "react-router-dom";
import { schedules } from "../../data/schedules";
import { comparisonEnabled, states } from "../../data/states";
import { minutesNow, nextDeadline, todayIso } from "../schedule";
import { DeadlineBadge } from "../components/DeadlineBadge";
import { formatDate } from "../text";
import { checkEligibility, type Verdict } from "../../engine/eligibility";
import { useProfile } from "../useProfile";
import { VerdictBand } from "../components/VerdictBadge";

const listFormat = new Intl.ListFormat("en", { style: "long", type: "conjunction" });

/** Card order: states the candidate can use first, then ones that need details, ruled-out states last. */
const verdictOrder: Record<Verdict["status"], number> = { eligible: 0, restricted: 1, incomplete: 2, notCovered: 3, ineligible: 4 };

export function HomePage() {
  const { profile } = useProfile();
  const rows = states
    .map((s) => ({ ...s, verdict: profile ? checkEligibility(profile, s.brochure) : null }))
    .sort((a, b) =>
      (a.verdict && b.verdict ? verdictOrder[a.verdict.status] - verdictOrder[b.verdict.status] : 0) ||
      a.brochure.meta.state.localeCompare(b.brochure.meta.state));
  const namesWith = (status: Verdict["status"]) =>
    rows.filter((r) => r.verdict?.status === status).map((r) => r.brochure.meta.state);
  const eligibleIn = namesWith("eligible");
  const partlyIn = namesWith("restricted");
  const needDetails = namesWith("incomplete");

  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center px-2 py-6 text-center sm:py-12">
        <p className="rounded-lg border border-line px-3 py-1 text-[13px] text-body">NEET PG 2026 · State quota counselling</p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-[1.05] tracking-[-0.03em] sm:text-6xl">
          Your state counselling brochure, explained for you.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-soft">
          Tell us about yourself once. For each state we'll show whether you're eligible and why, the deposit you'll need,
          every step in order, your document checklist and what resigning a seat would cost you. Every fact
          links to the brochure page it comes from.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link
            to="/profile"
            className="btn-primary"
          >
            {profile ? "Edit my profile" : "Start with my profile"}
          </Link>
          {states[0] && (
            <Link to={`/state/${states[0].key}`} className="btn-secondary">
              Browse a brochure
            </Link>
          )}
        </div>
      </section>

      {schedules.map(({ key, schedule }) => {
        const next = nextDeadline(schedule, todayIso(), minutesNow());
        return (
          <section key={key}>
            <Link to={`/mcc/${key}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-5 hover:border-line-strong hover:bg-canvas/60">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{schedule.meta.shortTitle}</h2>
                  {schedule.meta.tentative && <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-xs font-semibold text-warn">Tentative</span>}
                  {schedule.status === "draft" && <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-xs font-semibold text-warn">Draft</span>}
                </div>
                {next && <div className="mt-2"><DeadlineBadge date={next.date} time={next.time} kind={next.stage.key === "result" ? "event" : "deadline"} /></div>}
                <p className="mt-1 text-sm text-soft">
                  {next ? <>Next: {next.label}, <strong className="text-ink">{formatDate(next.date)}{next.time ? `, ${next.time}` : ""}</strong></> : "This schedule is over."}
                </p>
              </div>
              <span className="text-sm text-brand-strong">See all rounds →</span>
            </Link>
          </section>
        );
      })}

      <section>
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold">States</h2>
            <p className="text-sm text-soft">
              {profile ? "Your quick verdict for each state, based on your profile." : "Add your profile to see a verdict for each state."}
            </p>
            {profile && (
              <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
                {eligibleIn.length > 0 && (
                  <span><strong className="text-good">Eligible</strong> in {listFormat.format(eligibleIn)}</span>
                )}
                {partlyIn.length > 0 && (
                  <span><strong className="text-warn">Partly eligible</strong> in {listFormat.format(partlyIn)}</span>
                )}
                {eligibleIn.length === 0 && partlyIn.length === 0 && needDetails.length === 0 && (
                  <span><strong className="text-bad">Not eligible</strong> in any state covered so far</span>
                )}
                {needDetails.length > 0 && (
                  <span className="text-soft">{listFormat.format(needDetails)} {needDetails.length === 1 ? "needs" : "need"} a few more details</span>
                )}
              </p>
            )}
          </div>
          {comparisonEnabled && (
            <Link to="/compare" className="text-sm link">Compare states →</Link>
          )}
        </div>

        {!import.meta.env.DEV && states.some((s) => s.brochure.status === "draft") && (
          <p className="mb-4 rounded-lg border border-warn/30 bg-warn-tint px-4 py-2 text-sm text-warn">
            <strong>Preview:</strong> guides marked "Draft" haven't been checked by our team yet. Confirm every detail on the
            state's official website before you act on it.
          </p>
        )}

        {states.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-soft">
            No state brochures have been published yet. Check back soon.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(({ key, brochure, verdict }) => {
              return (
                // Subgrid rows keep the state names aligned across a row whatever the band's height.
                <li key={key} className="row-span-2 grid grid-rows-subgrid gap-0">
                  <Link
                    to={`/state/${key}`}
                    className="row-span-2 grid grid-rows-subgrid gap-0 overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong"
                  >
                    <VerdictBand verdict={verdict} />
                    <div className="flex flex-1 flex-col p-5 transition-colors hover:bg-canvas/60">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold">{brochure.meta.state}</h3>
                          <p className="text-sm text-soft">NEET PG {brochure.meta.year}</p>
                        </div>
                        {brochure.status === "draft" && (
                          <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-xs font-semibold text-warn">Draft</span>
                        )}
                      </div>
                      <p className="mt-3 flex-1 text-sm">{brochure.meta.coursesCovered.join(" · ")}</p>
                      <span className="mt-4 self-end text-sm text-brand-strong">Open guide →</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
