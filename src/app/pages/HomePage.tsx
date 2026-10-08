import { Link } from "react-router-dom";
import { schedules } from "../../data/schedules";
import { comparisonEnabled, states } from "../../data/states";
import { minutesNow, nextDeadline, todayIso } from "../schedule";
import { DeadlineBadge } from "../components/DeadlineBadge";
import { formatDate } from "../text";
import { checkEligibility } from "../../engine/eligibility";
import { useProfile } from "../useProfile";
import { VerdictBadge } from "../components/VerdictBadge";

export function HomePage() {
  const { profile } = useProfile();

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
                  {schedule.meta.tentative && <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-[11px] font-semibold text-warn">Tentative</span>}
                  {schedule.status === "draft" && <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-[11px] font-semibold text-warn">Draft</span>}
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
            {states.map(({ key, brochure }) => {
              const verdict = profile ? checkEligibility(profile, brochure) : null;
              return (
                <li key={key}>
                  <Link
                    to={`/state/${key}`}
                    className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-canvas/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">{brochure.meta.state}</h3>
                        <p className="text-sm text-soft">NEET PG {brochure.meta.year}</p>
                      </div>
                      {brochure.status === "draft" && (
                        <span className="rounded-md bg-warn-tint px-1.5 py-0.5 text-[11px] font-semibold text-warn">Draft</span>
                      )}
                    </div>
                    <p className="mt-3 flex-1 text-sm">{brochure.meta.coursesCovered.join(" · ")}</p>
                    <div className="mt-4 flex items-center justify-between">
                      {verdict ? <VerdictBadge verdict={verdict} /> : <span className="text-xs text-soft">No profile yet</span>}
                      <span className="text-sm text-brand-strong">Open guide →</span>
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
