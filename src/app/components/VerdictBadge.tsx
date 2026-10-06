import type { Verdict } from "../../engine/eligibility";

const styles: Record<Verdict["status"], string> = {
  eligible: "bg-good-tint text-good",
  restricted: "bg-warn-tint text-warn",
  ineligible: "bg-bad-tint text-bad",
  incomplete: "bg-canvas text-soft border border-line",
  notCovered: "bg-canvas text-soft border border-line",
};

const short: Record<Verdict["status"], string> = {
  eligible: "Eligible",
  restricted: "Partly eligible",
  ineligible: "Not eligible",
  incomplete: "Needs details",
  notCovered: "Not covered yet",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[verdict.status]}`}>
      {short[verdict.status]}
    </span>
  );
}

export const verdictPanel: Record<Verdict["status"], string> = {
  eligible: "border-good/30 bg-good-tint",
  restricted: "border-warn/30 bg-warn-tint",
  ineligible: "border-bad/30 bg-bad-tint",
  incomplete: "border-line bg-surface",
  notCovered: "border-line bg-surface",
};

export const verdictText: Record<Verdict["status"], string> = {
  eligible: "text-good",
  restricted: "text-warn",
  ineligible: "text-bad",
  incomplete: "text-ink",
  notCovered: "text-ink",
};
