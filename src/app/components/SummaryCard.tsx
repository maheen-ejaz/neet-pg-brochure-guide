import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import {
  adviseDeposit,
  documentsFor,
  type Verdict,
} from "../../engine/eligibility";
import type { Profile } from "../../engine/profile";
import type { Brochure } from "../../schema/stateBrochure";
import { kindFromLabel, timeFromLabel } from "../deadline";
import { todayIso } from "../schedule";
import { formatDate } from "../text";
import { DeadlineBadge } from "./DeadlineBadge";
import { Cite, inr } from "./ui";
import { VerdictBadge } from "./VerdictBadge";
import { Icon } from "./Icon";
import { useSeatView } from "../seats";

function SummaryTile({
  href,
  label,
  children,
  pages = [],
}: {
  href: string;
  label: string;
  children: ReactNode;
  pages?: number[];
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas/50 p-4">
      <a href={href} className="group block">
        <span className="flex items-center justify-between gap-2 text-xs text-soft">
          {label}
          <Icon name="arrow" className="h-4 w-4 group-hover:text-ink" />
        </span>
        <span className="mt-2 block font-semibold text-ink">{children}</span>
      </a>
      {pages.length > 0 && (
        <p className="mt-2 text-xs">
          <Cite pages={pages} />
        </p>
      )}
    </div>
  );
}

/** The candidate's key tasks, each linked to the full explanation and source details. */
export function SummaryCard({
  b,
  verdict,
  profile,
}: {
  b: Brochure;
  verdict: Verdict | null;
  profile: Profile | null;
}) {
  const today = todayIso();
  const { show } = useSeatView();
  const next = [...b.importantDates]
    .filter(
      (d) =>
        show(d) &&
        (d.endDate ?? d.date) >= today &&
        kindFromLabel(d.label) === "deadline",
    )
    .sort((x, y) =>
      (x.endDate ?? x.date).localeCompare(y.endDate ?? y.date),
    )[0];
  const advice = verdict ? adviseDeposit(verdict, b) : null;
  const upfront =
    b.fees.registration.amountInr + (advice?.recommended?.amountInr ?? 0);
  const docs = profile
    ? documentsFor(profile, b).filter(({ doc }) => show(doc)).length
    : b.documents.filter(show).length;
  const feePages = [
    ...new Set([
      ...b.fees.registration.sourcePages,
      ...(advice?.recommended?.sourcePages ?? []),
    ]),
  ];

  return (
    <section aria-labelledby="summary-title" className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Start here</p>
          <h2 id="summary-title" className="mt-1 text-xl">
            Your guide at a glance
          </h2>
        </div>
        <Link to="/profile" className="btn-secondary">
          {profile ? "Edit profile" : "Add my profile"}
        </Link>
      </div>
      {verdict ? (
        <a href="#verdict" className="mb-5 flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={verdict} />
          <span className="text-sm font-semibold text-ink">
            {verdict.headline}
          </span>
          <span className="link text-sm">See why</span>
        </a>
      ) : (
        <p className="mb-5 text-sm text-soft">
          Browse the guide now, or add your profile for an eligibility check and
          tailored checklist.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          href="#steps"
          label="Next deadline"
          pages={next?.sourcePages}
        >
          {next ? (
            <span className="flex flex-col gap-1">
              <span className="text-sm font-medium text-body">
                {next.label}
              </span>
              <span className="text-base">
                {formatDate(next.endDate ?? next.date)}
              </span>
              <DeadlineBadge
                date={next.endDate ?? next.date}
                time={next.endTime ?? timeFromLabel(next.label)}
              />
            </span>
          ) : (
            <span className="text-sm font-normal text-body">
              No upcoming dates in these documents
            </span>
          )}
        </SummaryTile>
        <SummaryTile
          href="#money"
          label={
            b.fees.calculationNote
              ? "Fees for your route"
              : advice?.recommended
                ? "Upfront fees + deposit"
                : "Registration fee"
          }
          pages={b.fees.calculationNote?.sourcePages ?? feePages}
        >
          {b.fees.calculationNote ? (
            <span className="text-sm">Check the fees for your route</span>
          ) : (
            <span className="text-2xl tabular-nums">{inr(upfront)}</span>
          )}
          <span className="mt-1 block text-xs font-normal text-soft">
            View the fee breakdown
          </span>
        </SummaryTile>
        <SummaryTile href="#documents" label="Checklist entries">
          <span className="text-2xl tabular-nums">{docs}</span>
          <span className="mt-1 block text-xs font-normal text-soft">
            {profile
              ? "Open your checklist"
              : "Add your profile to filter this checklist"}
          </span>
        </SummaryTile>
      </div>
    </section>
  );
}
