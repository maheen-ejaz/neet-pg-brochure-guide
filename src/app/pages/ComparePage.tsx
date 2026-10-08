import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { comparisonEnabled, states } from "../../data/states";
import { adviseDeposit, checkEligibility } from "../../engine/eligibility";
import type { Brochure } from "../../schema/stateBrochure";
import { inrShort } from "../components/ui";
import { VerdictBadge } from "../components/VerdictBadge";
import { useProfile } from "../useProfile";

const MAX = 3;

export function ComparePage() {
  const { profile } = useProfile();
  const published = states.filter((s) => s.brochure.status === "published");
  const [picked, setPicked] = useState<string[]>(() => published.slice(0, MAX).map((s) => s.key));

  if (!comparisonEnabled) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <h1 className="text-2xl font-semibold">Comparison is coming soon</h1>
        <p className="mt-2 text-soft">Side-by-side comparison opens once at least two state brochures are published.</p>
        <Link to="/" className="btn-secondary mt-4">Back to states</Link>
      </div>
    );
  }

  const chosen = published.filter((s) => picked.includes(s.key));
  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : p.length < MAX ? [...p, key] : p));

  const rows: { label: string; cell: (b: Brochure) => ReactNode }[] = [
    {
      label: "Your verdict",
      cell: (b) => (profile ? <VerdictBadge verdict={checkEligibility(profile, b)} /> : <Link to="/profile" className="link">Add profile</Link>),
    },
    {
      label: "Sectors open to you",
      cell: (b) => (profile ? checkEligibility(profile, b).sectors.join(" + ") || "None" : "—"),
    },
    { label: "Registration fee", cell: (b) => inrShort(b.fees.registration.amountInr) },
    {
      label: "Your security deposit",
      cell: (b) => {
        if (!profile) return b.fees.securityDeposits.map((d) => inrShort(d.amountInr)).join(" / ");
        const rec = adviseDeposit(checkEligibility(profile, b), b).recommended;
        return rec ? `${inrShort(rec.amountInr)} (${rec.label})` : "—";
      },
    },
    {
      label: "Service bond",
      cell: (b) =>
        b.serviceBond.bond
          ? `${b.serviceBond.bond.durationYears} yrs · ${b.serviceBond.bond.amounts.map((a) => inrShort(a.amountInr)).join(" / ")}`
          : "None stated",
    },
    {
      label: "Deposit forfeited if you resign",
      cell: (b) => {
        const first = b.resignation.ladder.find((l) => l.securityDeposit === "forfeited");
        return first ? `From: ${first.stage}` : "Not stated";
      },
    },
    { label: "Free-exit rule", cell: (b) => b.rounds.find((r) => /free exit/i.test(r.title + r.detail))?.detail ?? "Not stated" },
    { label: "Not in brochure", cell: (b) => b.gaps.map((g) => g.title).join(", ") || "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Compare states</h1>
        <p className="text-soft">Pick up to {MAX} states.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {published.map((s) => (
          <button key={s.key} type="button" onClick={() => toggle(s.key)} aria-pressed={picked.includes(s.key)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${picked.includes(s.key) ? "border-brand/60 bg-brand-tint text-brand-strong" : "border-line-strong bg-surface hover:border-soft"}`}>
            {s.brochure.meta.state} {s.brochure.meta.year}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="bg-canvas">
              <th className="w-48 p-3" />
              {chosen.map((s) => (
                <th key={s.key} className="p-3">
                  <Link to={`/state/${s.key}`} className="text-base font-semibold text-ink hover:underline">{s.brochure.meta.state}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line align-top">
                <th scope="row" className="p-3 font-medium text-soft">{r.label}</th>
                {chosen.map((s) => <td key={s.key} className="p-3 text-ink">{r.cell(s.brochure)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
