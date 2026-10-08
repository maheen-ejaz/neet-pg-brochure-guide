import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findState } from "../../data/states";
import { adviseDeposit, checkEligibility, documentsFor, type Verdict } from "../../engine/eligibility";
import type { Profile } from "../../engine/profile";
import type { Brochure } from "../../schema/stateBrochure";
import { Cite, DraftBanner, Marked, Prose, RuleCard, Section, SourceDocsContext, StatusChip, inr, inrShort } from "../components/ui";
import { VerdictBadge } from "../components/VerdictBadge";
import { SeatChip, SeatViewBanner, SeatViewContext, SeatViewSwitch, seatOrder, useSeatView, useStoredSeatView } from "../seats";
import { ImportantDates } from "../components/ImportantDates";
import { SummaryCard } from "../components/SummaryCard";
import { useProfile } from "../useProfile";
import { NotFound } from "./NotFound";

const NAV = [
  ["verdict", "Eligibility"],
  ["money", "Fees"],
  ["steps", "Steps"],
  ["choices", "Choice filling"],
  ["rounds", "Rounds"],
  ["documents", "Documents"],
  ["reservation", "Reservation"],
  ["resignation", "Resignation"],
  ["bond", "Service bond"],
  ["colleges", "Colleges / centres"],
  ["help", "Help desk"],
  ["gaps", "Not in brochure"],
] as const;

/** The section currently under the sticky menu: the last one whose top has scrolled past it. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    let jumpedAt = 0;
    const update = () => {
      frame = 0;
      // Right after a menu click, follow the link: sections near the page end can't scroll to the top.
      const target = window.location.hash.slice(1);
      if (Date.now() - jumpedAt < 1000 && ids.includes(target)) return setActive(target);
      const line = 130; // just below the sticky header and section menu
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    const onHash = () => { jumpedAt = Date.now(); onScroll(); };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHash);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

export function StatePage() {
  const { key } = useParams();
  const entry = findState(key);
  const { profile } = useProfile();
  const activeSection = useActiveSection(NAV.map(([id]) => id));
  const [seatView, setSeatView] = useStoredSeatView(profile?.nriLink === "self" || profile?.nriLink === "parent" || profile?.nriLink === "guardian");
  if (!entry) return <NotFound />;
  const { brochure: b } = entry;
  const verdict = profile ? checkEligibility(profile, b) : null;

  return (
    <SourceDocsContext.Provider value={b.source.documents}>
    <SeatViewContext.Provider value={seatView}>
    <div className="space-y-6">
      {b.status === "draft" && <DraftBanner />}
      <header>
        <p className="text-sm text-soft"><Link to="/" className="link">All states</Link> / {b.meta.state}</p>
        <h1 className="mt-3 text-3xl sm:text-[40px]">{b.meta.state} <span className="text-faint">NEET PG {b.meta.year}</span></h1>
        <p className="mt-1 text-soft">
          {b.meta.authority}
          <Cite pages={b.meta.sourcePages} />
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {b.meta.officialWebsites.map((w) => (
            <a key={w} href={w} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-[13px]">
              {w.replace(/^https?:\/\/(www\.)?/, "")} ↗
            </a>
          ))}
        </div>
        <div className="mt-5 space-y-2">
          <SeatViewSwitch view={seatView} onChange={setSeatView} terms={b.meta.seatTerms} />
          <SeatViewBanner view={seatView} terms={b.meta.seatTerms} />
        </div>
      </header>

      <SummaryCard b={b} verdict={verdict} profile={profile} />
      {seatView === "mgmtNri" && <SeatSummary b={b} />}

      <nav aria-label="Sections" className="no-print sticky top-[53px] z-10 -mx-4 overflow-x-auto border-b border-line bg-surface/90 px-4 py-2 backdrop-blur">
        <ul className="flex gap-1 whitespace-nowrap">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={activeSection === id ? "true" : undefined}
                className={`inline-block rounded-md px-2.5 py-1.5 text-[13px] ${activeSection === id ? "bg-brand-tint font-semibold text-brand-strong" : "text-soft hover:bg-canvas hover:text-ink"}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <VerdictSection b={b} verdict={verdict} profile={profile} />
      <MoneySection b={b} verdict={verdict} />
      <StepsSection b={b} />
      <Section id="choices" kicker="Before you lock" title="Choice filling rules">
        <div className="grid gap-3 sm:grid-cols-2">
          <SeatList items={b.choiceFilling} />
        </div>
      </Section>
      <RoundsSection b={b} />
      <DocumentsSection entryKey={entry.key} b={b} profile={profile} verdict={verdict} />
      <ReservationSection b={b} verdict={verdict} />
      <ResignationSection b={b} verdict={verdict} />
      <BondSection b={b} />
      {b.helpCentres.length > 0 && <HelpCentresSection b={b} />}
      <CollegesSection b={b} profile={profile} />
      <HelpSection b={b} />
      <Section id="gaps" kicker="Be aware" title="Not covered in this brochure" collapsible summary={`${b.gaps.length} things to check on the official website, plus forms and source documents`}>
        <p className="mb-4 text-sm text-soft">These are published separately, so check the official website for them.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {seatOrder(seatView, b.gaps).map((g) => (
            <div key={g.id} className="rounded-lg border border-dashed border-line-strong p-4">
              <SeatChip seats={g.seats} />
              <h3 className={`font-semibold ${g.seats ? "mt-1.5" : ""}`}>{g.title}</h3>
              <Prose text={g.detail} pages={g.sourcePages} className="mt-1" />
            </div>
          ))}
        </div>
        {b.annexures.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 font-semibold">Forms and annexures</h3>
            <ul className="space-y-1 text-sm">
              {seatOrder(seatView, b.annexures).map((a) => (
                <li key={a.id}><strong>{a.title}</strong>: <Marked text={a.description} /> <SeatChip seats={a.seats} /><Cite pages={a.sourcePages} /></li>
              ))}
            </ul>
          </>
        )}
        {b.source.documents.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 font-semibold">Official documents this guide is built from</h3>
            <ul className="space-y-1 text-sm">
              {b.source.documents.map((d) => (
                <li key={d.title}>
                  {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="font-medium link">{d.title} ↗</a> : <span className="font-medium text-ink">{d.title}</span>}
                  {d.issued && <span className="text-soft"> · {d.issued}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
    </SeatViewContext.Provider>
    </SourceDocsContext.Provider>
  );
}

/** Management & NRI view: everything in this brochure specific to those seats, with links to it. */
function SeatSummary({ b }: { b: Brochure }) {
  const { order } = useSeatView();
  type Row = { id: string; title: string; seats?: Brochure["eligibility"]["rules"][number]["seats"]; pages: number[] };
  const groups: [string, string, Row[]][] = [
    ["verdict", "Eligibility", b.eligibility.rules.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["money", "Fees", b.fees.rules.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["steps", "Steps", b.process.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["choices", "Choice filling", b.choiceFilling.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["rounds", "Rounds", b.rounds.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["documents", "Documents", [...b.documents.map((d) => ({ id: d.id, title: d.name, seats: d.seats, pages: d.sourcePages })), ...b.admission.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))]],
    ["reservation", "Reservation", b.reservation.rules.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
    ["resignation", "Resignation", [...b.resignation.ladder.map((l) => ({ id: l.id, title: l.stage, seats: l.seats, pages: l.sourcePages })), ...b.resignation.rules.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))]],
    ["bond", "Service bond", b.serviceBond.rules.map((r) => ({ id: r.id, title: r.title, seats: r.seats, pages: r.sourcePages }))],
  ];
  const specific = groups
    .map(([id, label, rows]) => [id, label, order(rows).filter((r) => r.seats)] as const)
    .filter(([, , rows]) => rows.length > 0);
  const count = specific.reduce((n, [, , rows]) => n + rows.length, 0);
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="seat-summary">
      <p className="text-xs text-soft">Management & NRI at a glance</p>
      <h2 id="seat-summary" className="text-lg sm:text-xl">
        {count === 0 ? "Nothing in this brochure is specific to these seats" : count === 1 ? "1 thing in this brochure is specific to these seats" : `${count} things in this brochure are specific to these seats`}
      </h2>
      {count === 0 ? (
        <p className="mt-2 text-sm">Everything below applies to all applicants. Check the official website for separate management or NRI notices.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {specific.map(([id, label, rows]) => (
            <div key={id}>
              <a href={`#${id}`} className="text-xs font-semibold tracking-wide text-soft uppercase hover:text-ink">{label} ↓</a>
              <ul className="mt-1.5 space-y-1.5 text-sm">
                {rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-medium text-ink">{r.title}</span>
                    <SeatChip seats={r.seats} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function VerdictSection({ b, verdict, profile }: { b: Brochure; verdict: Verdict | null; profile: Profile | null }) {
  const { show, order } = useSeatView();
  if (!verdict || !profile) {
    return (
      <Section id="verdict" kicker="Eligibility" title="Who can apply">
        <div className="mb-4 rounded-lg border border-line bg-canvas p-4">
          <p className="font-semibold text-ink">Want a personal verdict?</p>
          <p className="mt-1 text-sm">Add your profile and we'll check every rule below against it.</p>
          <Link to="/profile" className="btn-primary mt-3">Add my profile</Link>
        </div>
        <ul className="space-y-3">
          {order(b.eligibility.rules).map((r) => (
            <li key={r.id} className="rounded-lg border border-line p-4">
              <SeatChip seats={r.seats} />
              <h3 className={`font-semibold ${r.seats ? "mt-1.5" : ""}`}>{r.title}</h3>
              <Prose text={r.explanation} pages={r.sourcePages} className="mt-1" clamp={2} />
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  const reasons = verdict.reasons.filter((r) => show(r.rule));
  // What limits you first, then warnings, then information.
  const applied = reasons.filter((r) => r.match === "applies").sort((a, b) => reasonRank(a.rule.effect) - reasonRank(b.rule.effect));
  const maybe = reasons.filter((r) => r.match === "maybe");
  const manual = reasons.filter((r) => r.match === "manual");
  const icon = (r: (typeof applied)[number]) => {
    const e = r.rule.effect;
    if (e.type === "ineligible") return ["✕", "text-bad"];
    if (e.type === "restrictSectors" || e.type === "excludeCourses" || e.type === "restrictQuotas" || e.type === "notCovered") return ["!", "text-warn"];
    if (e.type === "note" && e.tone === "positive") return ["✓", "text-good"];
    if (e.type === "note" && e.tone === "warning") return ["!", "text-warn"];
    return ["i", "text-brand"];
  };

  return (
    <Section id="verdict" kicker="Your eligibility" title="Can you apply?" action={<Link to="/profile" className="btn-secondary !py-1.5 !text-[13px]">Edit profile</Link>}>
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="grid gap-2 p-4">
          <VerdictBadge verdict={verdict} />
          <p className="font-heading text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{verdict.headline}</p>
        </div>
        {verdict.status !== "ineligible" && verdict.status !== "incomplete" && verdict.status !== "notCovered" && (
          <div className="grid border-t border-line sm:grid-cols-3 sm:divide-x sm:divide-line">
            {verdict.quotas ? (
              <Fact label="Seat quotas open">{verdict.quotas.join(" / ")} only</Fact>
            ) : (
              <Fact label="College sectors open">
                {verdict.sectors.map((s) => s[0].toUpperCase() + s.slice(1)).join(" + ")}
              </Fact>
            )}
            <Fact label="You'll be counted as">{verdict.effectiveCategory ? CATEGORY_NAMES[verdict.effectiveCategory] : "—"}{profile.pwd ? " + PwD" : ""}</Fact>
            <Fact label="Not open to you">{verdict.excludedCourses.length ? `${verdict.excludedCourses.join(", ")} (state quota)` : "Nothing excluded"}</Fact>
          </div>
        )}
        {verdict.quotas && b.eligibility.quotaTerms && (
          <div className="border-t border-line p-4">
            <p className="text-xs text-soft">What these seats are</p>
            <dl className="mt-1.5 space-y-1.5 text-sm">
              {b.eligibility.quotaTerms.terms.filter((t) => verdict.quotas?.includes(t.code)).map((t) => (
                <div key={t.code} className="sm:flex sm:gap-2">
                  <dt className="shrink-0 font-semibold text-ink sm:w-28">{t.code}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-1 text-xs"><Cite pages={b.eligibility.quotaTerms.sourcePages} /></p>
          </div>
        )}
        {verdict.missingInfo.length > 0 && (
          <p className="border-t border-line bg-canvas p-4 text-sm">
            <strong>To complete this check, add:</strong> {verdict.missingInfo.join(", ")}.{" "}
            <Link to="/profile" className="link">Update profile</Link>
          </p>
        )}
      </div>

      {applied.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-[15px]">Why: the rules that apply to you</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
            {applied.map((r) => {
              const [glyph, color] = icon(r);
              return (
                <li key={r.rule.id} className="flex gap-3 p-4">
                  <span aria-hidden className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-canvas text-xs font-semibold ${color}`}>{glyph}</span>
                  <div>
                    <p className="font-semibold text-ink">{r.rule.title} <SeatChip seats={r.rule.seats} /></p>
                    <Prose text={r.rule.explanation} pages={r.rule.sourcePages} className="mt-0.5" />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {maybe.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-[15px]">Might apply: we need more details</h3>
          <ul className="space-y-2">
            {maybe.map((r) => (
              <li key={r.rule.id} className="rounded-lg border border-dashed border-line-strong p-3 text-sm">
                <p className="font-semibold text-ink">{r.rule.title} <SeatChip seats={r.rule.seats} /></p>
                <Prose text={r.rule.explanation} pages={r.rule.sourcePages} className="mt-0.5" />
              </li>
            ))}
          </ul>
        </>
      )}
      {manual.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-[15px]">Check these yourself</h3>
          <ul className="space-y-2">
            {manual.map((r) => (
              <li key={r.rule.id} className="flex gap-2 text-sm">
                <span aria-hidden className="text-soft">☐</span>
                <div>
                  <p className="font-semibold text-ink">{r.rule.title} <SeatChip seats={r.rule.seats} /></p>
                  <Prose text={r.rule.explanation} pages={r.rule.sourcePages} className="mt-0.5" clamp={2} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {profile.specialities.length > 0 && (
        <p className="mt-6 rounded-lg bg-canvas p-3 text-sm">
          <strong>Your specialities:</strong> {profile.specialities.join(", ")}. This brochure has no seat matrix or cutoffs, so we
          can't yet show your chances by speciality.
        </p>
      )}
    </Section>
  );
}

const CATEGORY_NAMES: Record<string, string> = { UR: "General (UR)", OBC: "OBC", SC: "SC", ST: "ST", EWS: "EWS" };

/** Order for "the rules that apply to you": blockers, then limits, then warnings, then information. */
function reasonRank(e: Brochure["eligibility"]["rules"][number]["effect"]): number {
  if (e.type === "ineligible") return 0;
  if (e.type === "notCovered") return 1;
  if (e.type === "restrictQuotas" || e.type === "restrictSectors" || e.type === "excludeCourses") return 2;
  if (e.type === "treatAsCategory") return 3;
  if (e.type === "note" && e.tone === "warning") return 4;
  if (e.type === "note" && e.tone === "positive") return 5;
  return 6;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line p-4 first:border-t-0 sm:border-t-0">
      <p className="text-xs text-soft">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{children}</p>
    </div>
  );
}

function MoneySection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
  const { order } = useSeatView();
  const advice = verdict ? adviseDeposit(verdict, b) : null;
  const reg = b.fees.registration;
  const total = advice?.recommended ? reg.amountInr + advice.recommended.amountInr : null;
  const hasDeposits = b.fees.securityDeposits.length > 0;
  return (
    <Section id="money" kicker="Your money" title={hasDeposits ? "Fees & security deposit" : "Fees"}>
      <div className={`grid gap-4 ${hasDeposits ? "md:grid-cols-[1fr_1.4fr]" : "md:grid-cols-2"}`}>
        <div className="panel-accent rounded-lg p-5">
          <p className="text-sm opacity-80">{advice?.recommended ? "You'll need to pay upfront" : "Registration fee"}</p>
          <p className="font-heading mt-1 text-4xl font-semibold tracking-tight tabular-nums">{inr(total ?? reg.amountInr)}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between gap-2 border-t border-white/20 pt-2">
              <span>Registration ({reg.refundable ? "refundable" : "non-refundable"})</span>
              <strong>{inr(reg.amountInr)}</strong>
            </li>
            {advice?.recommended && (
              <li className="flex justify-between gap-2 border-t border-white/20 pt-2">
                <span>Security deposit: {advice.recommended.label.toLowerCase()}</span>
                <strong>{inr(advice.recommended.amountInr)}</strong>
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs opacity-80">{reg.covers}</p>
          {!verdict && hasDeposits && <p className="mt-3 text-xs opacity-90">Add your profile to see which deposit applies to you.</p>}
        </div>
        {hasDeposits && <div>
          <p className="mb-2 text-sm font-semibold text-ink">Deposit tiers: your deposit decides which colleges you can choose<Cite pages={b.fees.securityDeposits.flatMap((d) => d.sourcePages).filter((v, i, a) => a.indexOf(v) === i)} /></p>
          <ul className="space-y-2">
            {order([...b.fees.securityDeposits].sort((x, y) => x.amountInr - y.amountInr)).map((t) => {
              const rec = advice?.recommended?.id === t.id;
              const alt = advice?.alternatives.find((a) => a.tier.id === t.id);
              const irrelevant = !!advice?.recommended && !rec && !alt;
              return (
                <li key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${rec ? "border-brand/50 bg-brand-tint" : "border-line"} ${irrelevant ? "bg-canvas [&_*]:!text-soft" : ""}`}>
                  <div>
                    <p className="font-semibold text-ink">{t.label} <SeatChip seats={t.seats} /></p>
                    <p className={`text-xs ${rec ? "text-body" : "text-soft"}`}>
                      {rec ? "Recommended for you: covers every college open to you" : alt ? `Cheaper option: ${alt.covers.join(" ")} colleges only` : irrelevant ? "Doesn't cover the colleges open to you" : " "}
                    </p>
                  </div>
                  <span className={`text-lg font-semibold tabular-nums ${rec ? "text-brand-strong" : "text-ink"}`}>{inrShort(t.amountInr)}</span>
                </li>
              );
            })}
          </ul>
        </div>}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SeatList items={b.fees.rules} />
      </div>
    </Section>
  );
}

function StepsSection({ b }: { b: Brochure }) {
  const { order } = useSeatView();
  const steps = order(b.process);
  const dates = order(b.importantDates);
  return (
    <Section id="steps" kicker="Process" title="Step by step">
      <ol className="relative space-y-4 border-l border-line-strong pl-6">
        {steps.map((s, i) => (
          <li key={s.id} className="relative">
            <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-md border border-line-strong bg-surface text-xs font-semibold text-soft tabular-nums">{i + 1}</span>
            <h3 className="font-semibold">{s.title} <SeatChip seats={s.seats} /></h3>
            <Prose text={s.description} pages={s.sourcePages} className="mt-0.5" />
            {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="text-sm link">{s.link.replace(/^https?:\/\//, "")} ↗</a>}
          </li>
        ))}
      </ol>
      <div className="mt-6">
        <h3 className="mb-2 font-semibold">Important dates</h3>
        {dates.length === 0 ? (
          <p className="text-sm">This brochure doesn't publish dates. Check the schedule notice on {b.meta.officialWebsites[0]?.replace(/^https?:\/\//, "")}.</p>
        ) : (
          <ImportantDates dates={dates} />
        )}
      </div>
    </Section>
  );
}

function RoundsSection({ b }: { b: Brochure }) {
  const { order } = useSeatView();
  const rounds = order(b.rounds);
  const groups = useMemo(() => {
    const m = new Map<string, Brochure["rounds"]>();
    for (const r of rounds) m.set(r.tag ?? "General", [...(m.get(r.tag ?? "General") ?? []), r]);
    return [...m.entries()];
  }, [rounds]);
  return (
    <Section id="rounds" kicker="Rounds" title="What happens in each round">
      <div className="space-y-3">
        {groups.map(([tag, rules], i) => <RoundGroup key={tag} tag={tag} rules={rules} defaultOpen={i < 2} />)}
      </div>
    </Section>
  );
}

/** One round's rules, folded under a heading that says how many rules and how many are critical. */
function RoundGroup({ tag, rules, defaultOpen }: { tag: string; rules: Brochure["rounds"]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const critical = rules.filter((r) => r.severity === "critical").length;
  const id = `round-${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="rounded-lg border border-line">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <span aria-hidden className={`text-sm text-soft transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
        <span className="font-semibold text-ink">{tag}</span>
        <span className="text-sm text-soft">{rules.length} {rules.length === 1 ? "rule" : "rules"}</span>
        {critical > 0 && <StatusChip className="bg-bad-tint text-bad">{critical} critical</StatusChip>}
      </button>
      {open && (
        <div id={id} className="grid gap-3 border-t border-line bg-canvas p-3 sm:grid-cols-2">
          {rules.map((r) => <RuleCard key={r.id} title={r.title} detail={r.detail} severity={r.severity} seats={r.seats} schedule={r.schedule} pages={r.sourcePages} />)}
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ entryKey, b, profile, verdict }: { entryKey: string; b: Brochure; profile: Profile | null; verdict: Verdict | null }) {
  const storeKey = `neetpg-guide:docs:${entryKey}`;
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) ?? "[]"); } catch { return []; }
  });
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* memory only */ }
  };
  const { show, order } = useSeatView();
  const allDocs = profile ? documentsFor(profile, b) : b.documents.map((doc) => ({ doc, certain: doc.appliesWhen === null }));
  const docs = [...allDocs.filter((d) => show(d.doc) && d.doc.seats), ...allDocs.filter((d) => show(d.doc) && !d.doc.seats)];
  const count = docs.filter((d) => done.includes(d.doc.id)).length;

  return (
    <Section
      id="documents"
      kicker="Checklist"
      title="Documents to carry"
      action={<button type="button" onClick={() => window.print()} className="no-print btn-secondary !py-1.5 !text-[13px]">Print checklist</button>}
    >
      {verdict?.status === "notCovered" && (
        <p className="mb-3 rounded-lg border border-warn/30 bg-warn-tint px-3 py-2 text-sm text-warn">
          <strong>Not for your course yet:</strong> this checklist is for {b.meta.coursesCovered.join(", ")}. This year's documents don't cover your course.
        </p>
      )}
      <p className="mb-3 text-sm text-soft">
        {profile ? "Filtered to your profile." : "Showing every document. Add your profile to filter it."} Bring originals and one self-attested photocopy set. {count}/{docs.length} ready.
      </p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="panel-accent h-full transition-all" style={{ width: `${docs.length ? (count / docs.length) * 100 : 0}%` }} /></div>
      <ul className="space-y-2">
        {docs.map(({ doc, certain }) => (
          <li key={doc.id}>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 hover:border-line-strong">
              <input type="checkbox" checked={done.includes(doc.id)} onChange={() => toggle(doc.id)} className="h-6 w-6 shrink-0 accent-[var(--brand)]" />
              <span className="text-sm">
                <span className={`font-medium text-ink ${done.includes(doc.id) ? "!text-soft line-through" : ""}`}>{doc.name}</span>
                {!certain && <span className="ml-2 rounded-md bg-warn-tint px-1.5 py-0.5 text-[11px] font-semibold text-warn">If applicable</span>}
                {doc.seats && <span className="ml-2"><SeatChip seats={doc.seats} /></span>}
                <Cite pages={doc.sourcePages} />
                {doc.detail && <span className="block text-soft"><Marked text={doc.detail} /></span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {order(b.admission).map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

/** Reservation bar segments: navy → blue → neutral, distinct in both themes. */
const BAR_COLOURS = ["var(--navy-a)", "var(--brand-strong)", "var(--brand)", "var(--line-strong)", "var(--soft)"];

function ReservationSection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
  const { show, order } = useSeatView();
  const policy = b.reservation.policy && show(b.reservation.policy) ? b.reservation.policy : null;
  const conversion = b.reservation.conversion && show(b.reservation.conversion) ? b.reservation.conversion : null;
  const policyHidden = !!b.reservation.policy && !policy;
  const bars = policy
    ? [...policy.vertical, { category: "UR (open)", percent: 100 - policy.vertical.reduce((s, v) => s + v.percent, 0) }]
    : [];
  return (
    <Section id="reservation" kicker="Reservation" title="How seats are reserved" collapsible summary={verdict?.effectiveCategory ? `You're counted as ${verdict.effectiveCategory}. Category shares, certificates and seat conversion.` : "Category shares, certificates and seat conversion."}>
      {verdict?.effectiveCategory && (
        <p className="mb-2 text-sm">You are counted as <strong>{verdict.effectiveCategory}</strong> in this state.</p>
      )}
      {policyHidden ? (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm">
          The reservation percentages apply only to {b.reservation.policy?.seats ? <SeatChip seats={b.reservation.policy.seats} /> : "certain seats"}. Switch to All seats to see them.
        </p>
      ) : policy ? (
        <>
          <p className="text-sm">Applies to: <strong><Marked text={policy.appliesTo} /></strong> <SeatChip seats={policy.seats} /><Cite pages={policy.sourcePages} /></p>
          {/* The bar is decorative; the legend below carries the numbers in readable text. */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full" role="img" aria-label={bars.map((v) => `${v.category} ${v.percent}%`).join(", ")}>
            {bars.map((v, i) => (
              <div key={v.category} style={{ width: `${v.percent}%`, background: BAR_COLOURS[i % BAR_COLOURS.length] }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {bars.map((v, i) => {
              const mine = !!verdict?.effectiveCategory && v.category.startsWith(verdict.effectiveCategory);
              return (
                <li key={v.category} className={`flex items-center gap-1.5 ${mine ? "font-semibold text-ink" : ""}`}>
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: BAR_COLOURS[i % BAR_COLOURS.length] }} />
                  {v.category} <span className="tabular-nums">{v.percent}%</span>{mine && <span className="text-xs text-soft">(you)</span>}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-soft">Vertical reservation. Horizontal: {policy.horizontal.map((h) => `${h.category} ${h.percent}%`).join(", ") || "none stated"}.</p>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm">
          This year's documents don't state the reservation percentages. Check the official website before choice filling.
        </p>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {conversion && (
          <div>
            <h3 className="font-semibold">Unfilled seat conversion<Cite pages={conversion.sourcePages} /></h3>
            <Prose text={conversion.when} className="mt-1 text-soft" />
            <ol className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
              {conversion.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-1.5">
                  <span className="w-5 text-xs text-soft">{i + 1}</span>
                  <span className="font-medium text-ink">{s.from}</span><span aria-hidden className="text-soft">→</span><span>{s.to}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className={`space-y-3 ${conversion ? "" : "md:col-span-2 md:grid md:grid-cols-2 md:gap-3 md:space-y-0"}`}>
          {order(b.reservation.rules).map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
        </div>
      </div>
    </Section>
  );
}

function ResignationSection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
  const sectors = verdict?.sectors.length ? verdict.sectors : ["government", "private"];
  const { show, order } = useSeatView();
  const ladder = b.resignation.ladder.filter((l) => (l.sector === "all" || sectors.includes(l.sector)) && show(l));
  return (
    <Section id="resignation" kicker="Exit costs" title="What resigning a seat costs you">
      {ladder.length === 0 ? (
        <p className="mb-4 rounded-lg border border-dashed border-line p-3 text-sm">This year's documents don't set out resignation penalties. Check the official website before you resign a seat.</p>
      ) : (
        <p className="mb-4 text-sm text-soft">The later you leave, the more you lose.{verdict ? " Showing the stages for the colleges open to you." : ""}</p>
      )}
      <ol className="space-y-2">
        {ladder.map((l, i) => {
          const lost = l.securityDeposit === "forfeited";
          return (
            <li key={l.id} className="grid gap-2 rounded-lg border border-line p-4 sm:grid-cols-[2rem_1fr_9rem] sm:items-center">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line-strong bg-surface text-xs font-semibold text-soft tabular-nums">{i + 1}</span>
              <div>
                <p className="font-semibold text-ink">{l.stage} <SeatChip seats={l.seats} /></p>
                <p className="text-xs text-soft"><Marked text={l.window} /></p>
                <Prose text={l.fees + (l.otherConsequence ? ` ${l.otherConsequence}` : "")} pages={l.sourcePages} className="mt-1" />
              </div>
              {l.securityDeposit && <span className="justify-self-start sm:justify-self-end"><StatusChip className={lost ? "bg-bad-tint text-bad" : "bg-good-tint text-good"}>Deposit {l.securityDeposit}</StatusChip></span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {order(b.resignation.rules).map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function BondSection({ b }: { b: Brochure }) {
  const { show, order } = useSeatView();
  const bond = b.serviceBond.bond && show(b.serviceBond.bond) ? b.serviceBond.bond : null;
  const bondHidden = !!b.serviceBond.bond && !bond;
  return (
    <Section id="bond" kicker="After PG" title="Service bond">
      {bondHidden ? (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm">
          The service bond in this brochure applies to <SeatChip seats={b.serviceBond.bond?.seats} /> Switch to All seats to see it.
        </p>
      ) : bond ? (
        <>
          <p className="text-sm">Applies to: <strong><Marked text={bond.appliesTo} /></strong> <SeatChip seats={bond.seats} /><Cite pages={bond.sourcePages} /></p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="panel-accent rounded-lg p-4">
              <p className="text-xs opacity-80">Service period</p>
              <p className="font-heading text-3xl font-semibold tracking-tight">{bond.durationYears} years</p>
            </div>
            {bond.amounts.map((a) => (
              <div key={a.course} className="rounded-lg border border-line p-4">
                <p className="text-xs text-soft">Penalty if you don't serve: {a.course}</p>
                <p className="font-heading text-3xl font-semibold tracking-tight text-ink tabular-nums">{inrShort(a.amountInr)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm"><strong>Where you'd serve:</strong> <Marked text={bond.placeOfService} /></p>
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-3 text-sm">These documents don't describe a service bond. Check the official website for this year's bond rules.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {order(b.serviceBond.rules).map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function CollegesSection({ b, profile }: { b: Brochure; profile: Profile | null }) {
  const [q, setQ] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const dental = profile?.courseType === "dental";
  const needle = q.trim().toLowerCase();
  const { show } = useSeatView();
  const rows = b.nodalCentres
    .filter(show)
    .map((n) => ({ n, colleges: (dental ? n.privateDental : n.privateMedical).filter((c) => c.toLowerCase().includes(needle) || n.centre.toLowerCase().includes(needle)) }))
    .filter((r) => r.colleges.length > 0);
  const total = b.nodalCentres.reduce((s, n) => s + (dental ? n.privateDental : n.privateMedical).length, 0);
  if (b.nodalCentres.length === 0 && b.disabilityCentres.length === 0) return null;
  return (
    <Section collapsible summary={b.nodalCentres.length ? "Which centre to report to for each private college" : "Where PwD candidates get certified"} id={b.helpCentres.length ? "pwd-centres" : "colleges"} kicker={b.nodalCentres.length ? "Where to report" : "PwD candidates"} title={b.nodalCentres.length ? `Private ${dental ? "dental" : "medical"} colleges & their admission centres` : "Disability medical boards"}>
      {b.nodalCentres.length > 0 && <>
      <p className="mb-3 text-sm text-soft">
        If you're allotted a private college, you take admission at its nodal centre. {total} colleges are listed.
        {!profile?.courseType && " Showing medical colleges. Set MDS in your profile to see dental colleges."}
      </p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a college or city…" aria-label="Search colleges"
        className="mb-4 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ n, colleges }) => (
          <div key={n.id} className="rounded-lg border border-line p-4">
            <p className="text-xs text-soft">Nodal centre</p>
            <h3 className="font-semibold">{n.centre}<Cite pages={n.sourcePages} /></h3>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">{colleges.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-soft">No matches.</p>}
      </div>
      </>}
      {b.disabilityCentres.length > 0 && (
        <div className={b.nodalCentres.length ? "mt-6" : ""}>
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-sm link" aria-expanded={showPwd || !!profile?.pwd}>
            {showPwd || profile?.pwd ? "▾" : "▸"} Designated disability certification centres ({b.disabilityCentres.length})
          </button>
          {(showPwd || profile?.pwd) && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-soft"><tr><th className="py-1 pr-3">Centre</th><th className="pr-3">Location</th><th>Remarks</th></tr></thead>
                <tbody>
                  {b.disabilityCentres.filter(show).map((d) => (
                    <tr key={d.id} className="border-t border-line align-top">
                      <td className="py-1.5 pr-3 font-medium text-ink">{d.name}</td><td className="pr-3">{d.location}</td><td>{d.remarks}<Cite pages={d.sourcePages} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

function HelpCentresSection({ b }: { b: Brochure }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const { show } = useSeatView();
  const rows = b.helpCentres.filter((c) => show(c) && (c.name + " " + c.address).toLowerCase().includes(needle));
  return (
    <Section id="colleges" kicker="Where to go" title="Help centres for document verification" collapsible summary={`${b.helpCentres.length} centres; search by city`}>
      <p className="mb-3 text-sm text-soft">Book an appointment while printing your registration slip, then visit with originals and one self-attested photocopy set.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city…" aria-label="Search help centres"
        className="mb-4 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((c) => (
          <li key={c.id} className="rounded-lg border border-line p-4">
            <p className="font-semibold text-ink">{c.name} <SeatChip seats={c.seats} /><Cite pages={c.sourcePages} /></p>
            <p className="mt-0.5 text-sm">{c.address}</p>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-soft">No matches.</li>}
      </ul>
    </Section>
  );
}

function HelpSection({ b }: { b: Brochure }) {
  const h = b.helpdesk;
  return (
    <Section id="help" kicker="Contact" title="Help desk" collapsible summary={[h.phones[0]?.numbers[0], h.emails[0]?.addresses[0]].filter(Boolean).join(" · ")}>
      <p className="text-sm">Hours: <strong><Marked text={h.hours} /></strong><Cite pages={h.sourcePages} /></p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {h.phones.map((p) => (
          <div key={p.label} className="rounded-lg border border-line p-4">
            <p className="font-semibold text-ink">{p.label}</p>
            <ul className="mt-1 space-y-0.5 text-sm">{p.numbers.map((n) => <li key={n}><a className="link" href={`tel:+91${n.replace(/^0/, "")}`}>{n}</a></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {h.emails.map((e) => (
          <div key={e.label} className="rounded-lg bg-canvas p-3 text-sm">
            <p className="font-semibold text-ink">{e.label} email</p>
            {e.addresses.map((a) => <a key={a} href={`mailto:${a}`} className="block break-all link">{a}</a>)}
          </div>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{h.instructions.map((i) => <li key={i}><Marked text={i} /></li>)}</ul>
    </Section>
  );
}

/** Rule cards for a list, filtered and ordered for the current seat view. */
function SeatList({ items }: { items: Brochure["choiceFilling"] }) {
  const { order } = useSeatView();
  return <>{order(items).map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}</>;
}
