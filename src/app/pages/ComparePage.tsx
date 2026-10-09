import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { comparisonEnabled, states } from "../../data/states";
import { adviseDeposit, checkEligibility } from "../../engine/eligibility";
import type { Brochure } from "../../schema/stateBrochure";
import { Cite, SourceDocsContext, inrShort } from "../components/ui";
import { Icon } from "../components/Icon";
import { VerdictBadge } from "../components/VerdictBadge";
import { useProfile } from "../useProfile";

const MAX = 3;

export function ComparePage() {
  const { profile } = useProfile();
  const published = states.filter((s) => s.brochure.status === "published");
  const [picked, setPicked] = useState<string[]>(() =>
    published.slice(0, MAX).map((s) => s.key),
  );

  if (!comparisonEnabled) {
    return (
      <div className="space-y-6">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Your counselling tools</p>
            <h1>Compare states</h1>
            <p>Eligibility, fees and commitments, in one side-by-side view.</p>
          </div>
        </header>
        <section className="card mx-auto max-w-2xl p-6 text-center sm:p-10">
          <Icon name="compare" className="mx-auto mb-5 h-8 w-8 text-soft" />
          <span className="mb-3 inline-block rounded-md bg-canvas px-2 py-1 text-xs text-soft">
            Coming soon
          </span>
          <h2 className="text-2xl font-semibold">
            Reviewed guides make better comparisons
          </h2>
          <p className="mt-2 text-soft">
            This tool opens when at least two state guides have completed review
            and are published. For now, open individual guides to explore their
            rules, fees and documents.
          </p>
          <Link to="/" className="btn-secondary mt-4">
            Explore state guides
          </Link>
        </section>
      </div>
    );
  }

  const chosen = published.filter((s) => picked.includes(s.key));
  const toggle = (key: string) =>
    setPicked((p) =>
      p.includes(key)
        ? p.filter((k) => k !== key)
        : p.length < MAX
          ? [...p, key]
          : p,
    );

  const rows: {
    label: string;
    cell: (b: Brochure) => ReactNode;
    pages: (b: Brochure) => number[];
  }[] = [
    {
      label: "Your eligibility",
      pages: (b) =>
        profile
          ? [
              ...b.eligibility.rules.flatMap((r) => r.sourcePages),
              ...(b.eligibility.manualReview?.sourcePages ?? []),
            ]
          : [],
      cell: (b) =>
        profile ? (
          <VerdictBadge verdict={checkEligibility(profile, b)} />
        ) : (
          <Link to="/profile" className="link">
            Add profile
          </Link>
        ),
    },
    {
      label: "Sectors open to you",
      pages: (b) =>
        profile
          ? [
              ...b.eligibility.rules.flatMap((r) => r.sourcePages),
              ...(b.eligibility.manualReview?.sourcePages ?? []),
            ]
          : [],
      cell: (b) =>
        profile
          ? checkEligibility(profile, b).status === "incomplete"
            ? "Confirm eligibility requirements"
            : checkEligibility(profile, b).sectors.join(" + ") || "None"
          : "—",
    },
    {
      label: "Registration fee",
      pages: (b) =>
        b.fees.calculationNote?.sourcePages ?? b.fees.registration.sourcePages,
      cell: (b) =>
        b.fees.calculationNote
          ? "See application and registration fee rules"
          : inrShort(b.fees.registration.amountInr),
    },
    {
      label: "Your security deposit",
      pages: (b) =>
        b.fees.calculationNote
          ? b.fees.calculationNote.sourcePages
          : profile
            ? (adviseDeposit(checkEligibility(profile, b), b).recommended
                ?.sourcePages ?? [])
            : b.fees.securityDeposits.flatMap((d) => d.sourcePages),
      cell: (b) => {
        if (b.fees.calculationNote) return "See quota-specific deposit rules";
        if (!profile)
          return b.fees.securityDeposits
            .map((d) => inrShort(d.amountInr))
            .join(" / ");
        const rec = adviseDeposit(checkEligibility(profile, b), b).recommended;
        return rec ? `${inrShort(rec.amountInr)} (${rec.label})` : "—";
      },
    },
    {
      label: "Service bond",
      pages: (b) =>
        b.eligibility.manualReview
          ? b.serviceBond.rules.flatMap((r) => r.sourcePages)
          : (b.serviceBond.bond?.sourcePages ??
            b.serviceBond.rules.flatMap((r) => r.sourcePages)),
      cell: (b) =>
        b.eligibility.manualReview
          ? "See programme-specific bond rules"
          : b.serviceBond.bond
            ? `${b.serviceBond.bond.durationYears} yrs · ${b.serviceBond.bond.amounts.map((a) => inrShort(a.amountInr)).join(" / ")}`
            : "None stated",
    },
    {
      label: "Deposit forfeited if you resign",
      pages: (b) =>
        b.resignation.ladder.find((l) => l.securityDeposit === "forfeited")
          ?.sourcePages ?? [],
      cell: (b) => {
        const first = b.resignation.ladder.find(
          (l) => l.securityDeposit === "forfeited",
        );
        return first ? `From: ${first.stage}` : "Not stated";
      },
    },
    {
      label: "Free-exit rule",
      pages: (b) =>
        b.rounds.find((r) => /free exit/i.test(r.title + r.detail))
          ?.sourcePages ?? [],
      cell: (b) =>
        b.rounds.find((r) => /free exit/i.test(r.title + r.detail))?.detail ??
        "Not stated",
    },
    {
      label: "Not in brochure",
      pages: (b) => b.gaps.flatMap((g) => g.sourcePages),
      cell: (b) => b.gaps.map((g) => g.title).join(", ") || "—",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Your counselling tools</p>
          <h1>Compare states</h1>
          <p>
            Choose up to {MAX} reviewed guides to compare eligibility, fees and
            commitments.
          </p>
        </div>
        <Link to="/profile" className="btn-secondary">
          {profile ? "Edit my profile" : "Add my profile"}
        </Link>
      </header>
      <div className="card p-5">
        <p className="mb-3 text-sm font-semibold text-ink">
          Choose your states{" "}
          <span className="font-normal text-soft">
            · {picked.length} of {MAX} selected
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {published.map((s) => (
            <button
              key={s.key}
              type="button"
              disabled={!picked.includes(s.key) && picked.length >= MAX}
              onClick={() => toggle(s.key)}
              aria-pressed={picked.includes(s.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${picked.includes(s.key) ? "border-brand/60 bg-brand-tint text-brand-strong" : "border-line-strong bg-surface hover:border-soft"}`}
            >
              {s.brochure.meta.state} {s.brochure.meta.year}
            </button>
          ))}
        </div>
      </div>
      {chosen.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl">Choose a state to begin</h2>
          <p className="mt-2 text-sm text-soft">
            Select up to three states above to build your comparison.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="dashboard-table min-w-[640px]">
            <thead>
              <tr className="bg-canvas">
                <th scope="col" className="w-48 p-3">
                  <span className="sr-only">What's compared</span>
                </th>
                {chosen.map((s) => (
                  <th key={s.key} scope="col" className="p-3">
                    <Link
                      to={`/state/${s.key}`}
                      className="text-base font-semibold text-ink hover:underline"
                    >
                      {s.brochure.meta.state}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line align-top">
                  <th scope="row" className="p-3 font-medium text-soft">
                    {r.label}
                  </th>
                  {chosen.map((s) => (
                    <td key={s.key} className="p-3 text-ink">
                      <SourceDocsContext.Provider
                        value={s.brochure.source.documents}
                      >
                        {r.cell(s.brochure)}
                        <p className="mt-2 text-xs">
                          <Cite pages={[...new Set(r.pages(s.brochure))]} />
                        </p>
                      </SourceDocsContext.Provider>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
