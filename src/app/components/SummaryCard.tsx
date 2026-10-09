import { Link } from "react-router-dom";
import { adviseDeposit, documentsFor, type Verdict } from "../../engine/eligibility";
import type { Profile } from "../../engine/profile";
import type { Brochure } from "../../schema/stateBrochure";
import { kindFromLabel, timeFromLabel } from "../deadline";
import { todayIso } from "../schedule";
import { formatDate } from "../text";
import { DeadlineBadge } from "./DeadlineBadge";
import { inr } from "./ui";
import { VerdictBadge } from "./VerdictBadge";
import { useSeatView } from "../seats";

/** The four things most candidates come for, at the top of a state page; each links to its section. */
export function SummaryCard({ b, verdict, profile }: { b: Brochure; verdict: Verdict | null; profile: Profile | null }) {
  const today = todayIso();
  const { show } = useSeatView();
  const next = [...b.importantDates]
    .filter((d) => show(d) && (d.endDate ?? d.date) >= today && kindFromLabel(d.label) === "deadline")
    .sort((x, y) => (x.endDate ?? x.date).localeCompare(y.endDate ?? y.date))[0];
  const advice = verdict ? adviseDeposit(verdict, b) : null;
  const upfront = b.fees.registration.amountInr + (advice?.recommended?.amountInr ?? 0);
  const docs = profile ? documentsFor(profile, b).filter(({ doc }) => show(doc)).length : b.documents.filter(show).length;

  const Tile = ({ href, label, children }: { href: string; label: string; children: React.ReactNode }) => (
    <a href={href} className="block rounded-lg border border-line p-3 hover:border-line-strong">
      <span className="block text-xs text-soft">{label}</span>
      <span className="mt-0.5 block font-semibold text-ink">{children}</span>
    </a>
  );

  return (
    <section aria-label="Your summary" className="card p-4 sm:p-5">
      {verdict ? (
        <a href="#verdict" className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={verdict} />
          <span className="font-heading text-lg font-semibold text-ink">{verdict.headline}</span>
          <span className="link text-sm">Why</span>
        </a>
      ) : (
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span>Add your profile to see whether you can apply and what you'll pay.</span>
          <Link to="/profile" className="btn-primary !py-1.5">Add my profile</Link>
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Tile href="#steps" label="Next deadline">
          {next ? (
            <span className="flex flex-col gap-1">
              <span>{next.label}: {formatDate(next.endDate ?? next.date)}</span>
              <DeadlineBadge date={next.endDate ?? next.date} time={next.endTime ?? timeFromLabel(next.label)} />
            </span>
          ) : (
            <span className="font-normal text-body">No upcoming dates in these documents</span>
          )}
        </Tile>
        <Tile href="#money" label={b.fees.calculationNote ? "Fees" : advice?.recommended ? "You'll pay upfront" : "Registration fee"}>
          {b.fees.calculationNote ? "Check the fees for your route" : inr(upfront)}
        </Tile>
        <Tile href="#documents" label="Checklist entries">{docs}{profile ? "" : " (add your profile to filter)"}</Tile>
      </div>
    </section>
  );
}
