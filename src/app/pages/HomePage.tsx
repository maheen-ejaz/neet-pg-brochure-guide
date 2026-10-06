import { Link } from "react-router-dom";
import { comparisonEnabled, states } from "../../data/states";
import { checkEligibility } from "../../engine/eligibility";
import { useProfile } from "../useProfile";
import { VerdictBadge } from "../components/VerdictBadge";

export function HomePage() {
  const { profile } = useProfile();

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-brand-strong px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-semibold tracking-wide text-white/70 uppercase">NEET PG 2026 · State quota counselling</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold text-balance text-white sm:text-5xl">
          Your state counselling brochure, explained for you.
        </h1>
        <p className="mt-4 max-w-xl text-white/85">
          Tell us about yourself once. For each state we'll show whether you're eligible and why, the deposit you'll need,
          every step in order, your document checklist and what resigning a seat would cost you. Every fact
          links to the brochure page it comes from.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/profile"
            className="rounded-full bg-white px-5 py-2.5 font-semibold text-brand-strong shadow-sm transition hover:bg-brand-tint"
          >
            {profile ? "Edit my profile" : "Start with my profile"}
          </Link>
          {states[0] && (
            <Link to={`/state/${states[0].key}`} className="rounded-full border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
              Browse a brochure
            </Link>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold">States</h2>
            <p className="text-sm text-soft">
              {profile ? "Your quick verdict for each state, based on your profile." : "Add your profile to see a verdict for each state."}
            </p>
          </div>
          {comparisonEnabled && (
            <Link to="/compare" className="text-sm font-semibold text-brand-strong hover:underline">Compare states →</Link>
          )}
        </div>

        {states.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-soft">
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
                    className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-brand hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold">{brochure.meta.state}</h3>
                        <p className="text-sm text-soft">NEET PG {brochure.meta.year}</p>
                      </div>
                      {brochure.status === "draft" && (
                        <span className="rounded-full bg-warn-tint px-2 py-0.5 text-[11px] font-semibold text-warn">Draft</span>
                      )}
                    </div>
                    <p className="mt-3 flex-1 text-sm">{brochure.meta.coursesCovered.join(" · ")}</p>
                    <div className="mt-4 flex items-center justify-between">
                      {verdict ? <VerdictBadge verdict={verdict} /> : <span className="text-xs text-soft">No profile yet</span>}
                      <span className="text-sm font-semibold text-brand-strong">Open guide →</span>
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
