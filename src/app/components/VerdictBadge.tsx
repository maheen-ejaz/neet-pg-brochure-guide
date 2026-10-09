import type { Verdict } from "../../engine/eligibility";
import { StatusChip } from "./ui";

const styles: Record<Verdict["status"], string> = {
  eligible: "bg-good-tint text-good",
  restricted: "bg-warn-tint text-warn",
  ineligible: "bg-bad-tint text-bad",
  incomplete: "bg-canvas text-soft",
  notCovered: "bg-canvas text-soft",
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
    <StatusChip className={styles[verdict.status]}>{short[verdict.status]}</StatusChip>
  );
}

export { styles as verdictChip };

/**
 * Band background and word colour. Eligible and partly eligible get a status tint so they stand out;
 * "not eligible" stays on a neutral band (red word only) so the eye goes to the states the candidate can use.
 */
const band: Record<Verdict["status"], { bg: string; word: string }> = {
  eligible: { bg: "bg-good-tint", word: "text-good" },
  restricted: { bg: "bg-warn-tint", word: "text-warn" },
  ineligible: { bg: "bg-canvas", word: "text-bad" },
  incomplete: { bg: "bg-canvas", word: "text-soft" },
  notCovered: { bg: "bg-canvas", word: "text-soft" },
};

/**
 * One plain line on what the verdict means: what's open to the candidate (the headline without the
 * repeated "Eligible for"), or the rule that rules them out.
 */
export function verdictDetail(verdict: Verdict): string {
  if (verdict.status === "ineligible") {
    const blocking = verdict.reasons.find((r) => r.match === "applies" && r.rule.effect.type === "ineligible");
    if (blocking) return blocking.rule.title;
  }
  if (verdict.status !== "eligible" && verdict.status !== "restricted") return verdict.headline;
  const open = verdict.headline.replace(/^Eligible for /, "");
  const detail = open.charAt(0).toUpperCase() + open.slice(1);
  return verdict.excludedCourses.length > 0 ? `${detail}, except ${verdict.excludedCourses.join(", ")}` : detail;
}

function VerdictIcon({ status }: { status: Verdict["status"] }) {
  const path =
    status === "eligible" ? "M6 10.5l2.5 2.5L14 7.5" :
    status === "ineligible" ? "M7 7l6 6M13 7l-6 6" :
    status === "restricted" ? null :
    "M10 6.5v4M10 13.5v.01";
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.25" strokeWidth="1.5" />
      {path ? <path d={path} /> : <path d="M10 1.75a8.25 8.25 0 0 1 0 16.5z" fill="currentColor" stroke="none" />}
    </svg>
  );
}

/** Full-width verdict band for the top of a state card: icon + word in the status colour, plain detail below. */
export function VerdictBand({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) {
    return (
      <div className="border-t border-line bg-canvas px-5 py-3 text-sm text-soft">
        Add your profile to check your eligibility
      </div>
    );
  }
  const { bg, word } = band[verdict.status];
  const strong = verdict.status === "eligible" || verdict.status === "restricted";
  return (
    <div className={`border-t border-line px-5 py-3 ${bg}`}>
      <p className={`flex items-center gap-2 font-semibold ${word} ${strong ? "text-base" : "text-sm"}`}>
        <VerdictIcon status={verdict.status} />
        {short[verdict.status]}
      </p>
      <p className="mt-0.5 pl-7 text-sm text-body">{verdictDetail(verdict)}</p>
    </div>
  );
}
