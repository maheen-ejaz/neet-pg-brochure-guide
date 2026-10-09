import { useState } from "react";
import { Link } from "react-router-dom";
import { schedules } from "../../data/schedules";
import { comparisonEnabled, states } from "../../data/states";
import { minutesNow, nextDeadline, scheduleDocs, todayIso } from "../schedule";
import { DeadlineBadge, useNow } from "../components/DeadlineBadge";
import { Cite, SourceDocsContext, StatusChip } from "../components/ui";
import { formatDate } from "../text";
import { checkEligibility, type Verdict } from "../../engine/eligibility";
import { useProfile } from "../useProfile";
import { VerdictBadge, VerdictBand } from "../components/VerdictBadge";
import { Icon } from "../components/Icon";

const verdictOrder: Record<Verdict["status"], number> = {
  eligible: 0,
  restricted: 1,
  incomplete: 2,
  notCovered: 3,
  ineligible: 4,
};

export function HomePage() {
  const now = useNow();
  const { profile } = useProfile();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const rows = states
    .map((s) => ({
      ...s,
      verdict: profile ? checkEligibility(profile, s.brochure) : null,
    }))
    .sort(
      (a, b) =>
        (a.verdict && b.verdict
          ? verdictOrder[a.verdict.status] - verdictOrder[b.verdict.status]
          : 0) || a.brochure.meta.state.localeCompare(b.brochure.meta.state),
    );
  const visible = rows.filter(
    (r) =>
      r.brochure.meta.state
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!profile || filter === "all" || r.verdict?.status === filter),
  );
  const needsDetails = rows.some((r) => r.verdict?.status === "incomplete");
  const draft =
    states.some((s) => s.brochure.status === "draft") ||
    schedules.some((s) => s.schedule.status === "draft");

  return (
    <div className="space-y-8">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your counselling workspace</p>
          <h1>Make sense of your next step.</h1>
          <p>
            Explore state rules, check your eligibility and keep counselling
            dates in view.
          </p>
        </div>
        <a href="#state-guides" className="btn-secondary shrink-0">
          Explore state guides <span aria-hidden>↓</span>
        </a>
      </header>

      <section
        className="card overflow-hidden"
        aria-labelledby="profile-panel-title"
      >
        <div className="grid lg:grid-cols-[1.3fr_1fr]">
          <div className="p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-sm text-soft">
              <Icon name="profile" />
              <span>My profile</span>
              <StatusChip className="bg-canvas text-body">
                {profile ? "Saved in this browser" : "Not added yet"}
              </StatusChip>
            </div>
            <h2 id="profile-panel-title" className="text-xl">
              {profile
                ? needsDetails
                  ? "Some eligibility checks need a closer look."
                  : "Your state checks are ready to explore."
                : "One profile. Guidance tailored to you."}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-soft">
              {profile
                ? "Your answers are used to check each state's rules. Open a guide for the reasons, costs, checklist and any requirements to confirm manually."
                : "Add your course, education and category to see which state rules apply to you. You can browse every guide without a profile."}
            </p>
            <Link to="/profile" className="btn-primary mt-4">
              {profile
                ? needsDetails
                  ? "Review my profile"
                  : "Edit my profile"
                : "Set up my profile"}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-t border-line bg-canvas/50 lg:border-t-0 lg:border-l">
            {[
              ["01", "Check eligibility", "See the rules that apply to you."],
              ["02", "Plan your costs", "Find fees and deposit details."],
              ["03", "Prepare to apply", "Follow steps and gather documents."],
            ].map(([number, title, detail]) => (
              <div
                key={number}
                className="px-3 py-5 sm:p-5 lg:flex lg:flex-col lg:justify-center"
              >
                <p className="mb-4 font-mono text-xs text-soft">{number}</p>
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="mt-1 text-xs text-soft">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="state-guides"
        className="scroll-mt-36"
        aria-labelledby="states-title"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Explore your options</p>
            <h2 id="states-title" className="mt-1 text-2xl">
              State guides{" "}
              <span className="ml-1 rounded-md border border-line bg-surface px-2 py-0.5 align-middle text-sm font-medium text-soft">
                {states.length}
              </span>
            </h2>
            <p className="mt-2 text-sm text-soft">
              {profile
                ? "Ordered by your eligibility. Open a guide for the full picture."
                : "Eligibility, fees, rounds and documents — organised by state."}
            </p>
          </div>
          <div
            className="view-switch"
            role="group"
            aria-label="State guide display"
          >
            <button
              type="button"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
            >
              <Icon name="dashboard" className="h-4 w-4" />
              Cards
            </button>
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Icon name="list" className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>
        {draft && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-sm text-warn">
            <span aria-hidden className="font-semibold">
              !
            </span>
            <p>
              <strong>You're exploring a draft preview.</strong> Draft guides
              and schedules await team review. Confirm details on the official
              website before acting.
            </p>
          </div>
        )}
        {states.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <label htmlFor="state-search" className="sr-only">
                Search state guides
              </label>
              <span className="pointer-events-none absolute top-3 left-3 text-soft">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                id="state-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by state name"
                className="dashboard-input pl-10"
              />
            </div>
            {profile && (
              <>
                <label htmlFor="eligibility-filter" className="sr-only">
                  Filter by eligibility
                </label>
                <select
                  id="eligibility-filter"
                  className="dashboard-input w-auto"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">All eligibility results</option>
                  <option value="eligible">Eligible</option>
                  <option value="restricted">Partly eligible</option>
                  <option value="incomplete">Needs details</option>
                  <option value="notCovered">Course not covered</option>
                  <option value="ineligible">Not eligible</option>
                </select>
              </>
            )}
            <p role="status" className="text-xs text-soft sm:ml-auto">
              Showing {visible.length} of {states.length} guides
            </p>
          </div>
        )}
        {states.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="book" className="mx-auto mb-3 h-6 w-6 text-soft" />
            <h3 className="text-lg">State guides are on their way</h3>
            <p className="mt-2 text-sm text-soft">
              No state brochures have been published yet. Check back for
              reviewed guides.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="card p-8 text-center">
            <h3 className="text-lg">No guides match these filters</h3>
            <p className="mt-2 text-sm text-soft">
              Try another state name or show all eligibility results.
            </p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : view === "cards" ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ key, brochure, verdict }) => (
              <li key={key} className="row-span-3 grid grid-rows-subgrid gap-0">
                <Link
                  to={`/state/${key}`}
                  className="state-card group row-span-3 grid grid-rows-subgrid gap-0"
                >
                  <div className="flex-1 p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-canvas text-soft">
                        <Icon name="book" />
                      </span>
                      <StatusChip
                        className={
                          brochure.status === "draft"
                            ? "bg-warn-tint text-warn"
                            : "bg-good-tint text-good"
                        }
                      >
                        {brochure.status === "draft" ? "Draft" : "Reviewed"}
                      </StatusChip>
                    </div>
                    <h3 className="text-xl">{brochure.meta.state}</h3>
                    <p className="mt-1 text-sm text-soft">
                      NEET PG {brochure.meta.year} ·{" "}
                      {brochure.meta.coursesCovered.join(" / ")}
                    </p>
                    <p className="mt-4 text-xs text-soft">
                      Eligibility · Fees · Rounds · Documents
                    </p>
                  </div>
                  <VerdictBand verdict={verdict} />
                  <div className="flex items-center justify-between border-t border-line px-5 py-3.5 text-sm font-semibold text-ink">
                    <span>Explore state guide</span>
                    <Icon
                      name="arrow"
                      className="h-4 w-4 text-soft group-hover:text-ink"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card overflow-x-auto">
            <table className="dashboard-table min-w-[620px]">
              <caption className="sr-only">
                State guides and your eligibility results
              </caption>
              <thead>
                <tr>
                  <th scope="col">State / year</th>
                  <th scope="col">Courses</th>
                  <th scope="col">Your eligibility</th>
                  <th scope="col">Review status</th>
                  <th scope="col">
                    <span className="sr-only">Open guide</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ key, brochure, verdict }) => (
                  <tr key={key}>
                    <th scope="row">
                      <Link className="link font-semibold" to={`/state/${key}`}>
                        {brochure.meta.state}
                      </Link>
                      <p className="mt-1 text-xs font-normal text-soft">
                        NEET PG {brochure.meta.year}
                      </p>
                    </th>
                    <td>{brochure.meta.coursesCovered.join(" / ")}</td>
                    <td>
                      {verdict ? (
                        <VerdictBadge verdict={verdict} />
                      ) : (
                        <Link to="/profile" className="link">
                          Add profile to check
                        </Link>
                      )}
                    </td>
                    <td>
                      <StatusChip
                        className={
                          brochure.status === "draft"
                            ? "bg-warn-tint text-warn"
                            : "bg-good-tint text-good"
                        }
                      >
                        {brochure.status === "draft" ? "Draft" : "Reviewed"}
                      </StatusChip>
                    </td>
                    <td>
                      <Link
                        to={`/state/${key}`}
                        className="btn-secondary"
                        aria-label={`Open ${brochure.meta.state} guide`}
                      >
                        <Icon name="arrow" className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="tools-title">
        <p className="eyebrow">Keep planning</p>
        <h2 id="tools-title" className="mt-1 mb-4 text-2xl">
          Your counselling tools
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {schedules.map(({ key, schedule }) => {
            const next = nextDeadline(schedule, todayIso(now), minutesNow(now));
            const wrongCourse =
              profile?.courseType &&
              !schedule.meta.courses.includes(profile.courseType);
            return (
              <SourceDocsContext.Provider
                key={key}
                value={scheduleDocs(schedule)}
              >
                <article className="card flex flex-col p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Icon
                      name="calendar"
                      className="mr-auto h-5 w-5 text-soft"
                    />
                    {schedule.meta.tentative && (
                      <StatusChip className="bg-warn-tint text-warn">
                        Tentative
                      </StatusChip>
                    )}
                    {schedule.status === "draft" && (
                      <StatusChip className="bg-warn-tint text-warn">
                        Draft
                      </StatusChip>
                    )}
                  </div>
                  <h3 className="text-lg">{schedule.meta.shortTitle}</h3>
                  <p className="mt-2 text-sm text-soft">
                    Registration, choice filling and reporting dates in one
                    timeline.
                  </p>
                  {wrongCourse ? (
                    <p className="mt-4 rounded-lg bg-warn-tint p-3 text-sm text-warn">
                      Your profile says MDS. This schedule covers NEET-PG; it
                      doesn't mention MDS.
                    </p>
                  ) : next ? (
                    <div className="mt-4 rounded-lg border border-line bg-canvas p-3">
                      <p className="text-xs text-soft">Next on the schedule</p>
                      <p className="mt-1 text-sm font-semibold text-ink">
                        {next.label}
                      </p>
                      <p className="mt-1 text-sm">
                        {formatDate(next.date)}
                        {next.time ? `, ${next.time}` : ""}
                        <Cite pages={next.round.sourcePages} />
                      </p>
                      <div className="mt-2">
                        <DeadlineBadge
                          date={next.date}
                          time={next.time}
                          kind={
                            next.stage.key === "result" ? "event" : "deadline"
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs text-soft">App clock: IST. Confirm server time on MCC.</p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-soft">
                      No upcoming dates in this schedule. Check MCC for later
                      notices.
                    </p>
                  )}
                  <Link
                    to={`/mcc/${key}`}
                    className="mt-5 inline-flex items-center gap-2 self-start text-sm link"
                  >
                    Open MCC timeline
                    <Icon name="arrow" className="h-4 w-4" />
                  </Link>
                </article>
              </SourceDocsContext.Provider>
            );
          })}
          <article className="card flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between">
              <Icon name="compare" className="h-5 w-5 text-soft" />
              {!comparisonEnabled && (
                <StatusChip className="bg-canvas text-body">
                  Coming soon
                </StatusChip>
              )}
            </div>
            <h3 className="text-lg">Compare states side by side</h3>
            <p className="mt-2 text-sm text-soft">
              Review eligibility, deposits and service bonds across up to three
              states.
            </p>
            <div className="mt-4 flex-1 rounded-lg border border-line bg-canvas p-4 text-sm text-soft">
              {comparisonEnabled
                ? "Choose the states you want to compare, using the same profile for each."
                : "Comparison opens when at least two state guides have completed review and are published."}
            </div>
            {comparisonEnabled ? (
              <Link
                to="/compare"
                className="mt-5 inline-flex items-center gap-2 self-start text-sm link"
              >
                Compare states
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-5 text-xs text-soft">
                For now, explore the individual state guides above.
              </p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
