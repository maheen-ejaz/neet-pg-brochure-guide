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
