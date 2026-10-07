import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findState } from "../../data/states";
import { adviseDeposit, checkEligibility, documentsFor, type Verdict } from "../../engine/eligibility";
import type { Profile } from "../../engine/profile";
import type { Brochure } from "../../schema/stateBrochure";
import { Cite, DraftBanner, Marked, Prose, RuleCard, Section, SourceDocsContext, StatusChip, inr, inrShort } from "../components/ui";
import { VerdictBadge } from "../components/VerdictBadge";
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

export function StatePage() {
  const { key } = useParams();
  const entry = findState(key);
  const { profile } = useProfile();
  if (!entry) return <NotFound />;
  const { brochure: b } = entry;
  const verdict = profile ? checkEligibility(profile, b) : null;

  return (
    <SourceDocsContext.Provider value={b.source.documents}>
    <div className="space-y-6">
      {b.status === "draft" && <DraftBanner />}
      <header>
        <p className="text-sm text-soft"><Link to="/" className="text-brand-strong hover:underline">All states</Link> / {b.meta.state}</p>
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
      </header>

      <nav aria-label="Sections" className="no-print sticky top-[53px] z-10 -mx-4 overflow-x-auto border-b border-line bg-surface/90 px-4 py-2 backdrop-blur">
        <ul className="flex gap-1 whitespace-nowrap">
          {NAV.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="rounded-md px-2.5 py-1 text-[13px] text-soft hover:bg-canvas hover:text-ink">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <VerdictSection b={b} verdict={verdict} profile={profile} />
      <MoneySection b={b} verdict={verdict} />
      <StepsSection b={b} />
      <Section id="choices" kicker="Before you lock" title="Choice filling rules">
        <div className="grid gap-3 sm:grid-cols-2">
          {b.choiceFilling.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
        </div>
      </Section>
      <RoundsSection b={b} />
      <DocumentsSection entryKey={entry.key} b={b} profile={profile} />
      <ReservationSection b={b} verdict={verdict} />
      <ResignationSection b={b} verdict={verdict} />
      <BondSection b={b} />
      {b.helpCentres.length > 0 && <HelpCentresSection b={b} />}
      <CollegesSection b={b} profile={profile} />
      <HelpSection b={b} />
      <Section id="gaps" kicker="Be aware" title="Not covered in this brochure">
        <p className="mb-4 text-sm text-soft">These are published separately, so check the official website for them.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {b.gaps.map((g) => (
            <div key={g.id} className="rounded-lg border border-dashed border-line-strong p-4">
              <h3 className="font-semibold">{g.title}</h3>
              <Prose text={g.detail} pages={g.sourcePages} className="mt-1" />
            </div>
          ))}
        </div>
        {b.annexures.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 font-semibold">Forms and annexures</h3>
            <ul className="space-y-1 text-sm">
              {b.annexures.map((a) => (
                <li key={a.id}><strong>{a.title}</strong>: <Marked text={a.description} /><Cite pages={a.sourcePages} /></li>
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
                  {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="font-medium text-brand-strong hover:underline">{d.title} ↗</a> : <span className="font-medium text-ink">{d.title}</span>}
                  {d.issued && <span className="text-soft"> · {d.issued}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
    </SourceDocsContext.Provider>
  );
}

function VerdictSection({ b, verdict, profile }: { b: Brochure; verdict: Verdict | null; profile: Profile | null }) {
  if (!verdict || !profile) {
    return (
      <Section id="verdict" kicker="Eligibility" title="Who can apply">
        <div className="mb-4 rounded-lg border border-line bg-canvas p-4">
          <p className="font-semibold text-ink">Want a personal verdict?</p>
          <p className="mt-1 text-sm">Add your profile and we'll check every rule below against it.</p>
          <Link to="/profile" className="btn-primary mt-3">Add my profile</Link>
        </div>
        <ul className="space-y-3">
          {b.eligibility.rules.map((r) => (
            <li key={r.id} className="rounded-lg border border-line p-4">
              <h3 className="font-semibold">{r.title}</h3>
              <Prose text={r.explanation} pages={r.sourcePages} className="mt-1" />
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  const applied = verdict.reasons.filter((r) => r.match === "applies");
  const maybe = verdict.reasons.filter((r) => r.match === "maybe");
  const manual = verdict.reasons.filter((r) => r.match === "manual");
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
            <Fact label="You'll be counted as">{verdict.effectiveCategory ?? "—"}{profile.pwd ? " + PwD" : ""}</Fact>
            <Fact label="Not open to you">{verdict.excludedCourses.length ? `${verdict.excludedCourses.join(", ")} (state quota)` : "Nothing excluded"}</Fact>
          </div>
        )}
        {verdict.missingInfo.length > 0 && (
          <p className="border-t border-line bg-canvas p-4 text-sm">
            <strong>To complete this check, add:</strong> {verdict.missingInfo.join(", ")}.{" "}
            <Link to="/profile" className="text-brand-strong underline">Update profile</Link>
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
                    <p className="font-semibold text-ink">{r.rule.title}</p>
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
                <p className="font-semibold text-ink">{r.rule.title}</p>
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
                  <p className="font-semibold text-ink">{r.rule.title}</p>
                  <Prose text={r.rule.explanation} pages={r.rule.sourcePages} className="mt-0.5" />
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line p-4 first:border-t-0 sm:border-t-0">
      <p className="text-xs text-soft">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{children}</p>
    </div>
  );
}

function MoneySection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
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
            {[...b.fees.securityDeposits].sort((x, y) => x.amountInr - y.amountInr).map((t) => {
              const rec = advice?.recommended?.id === t.id;
              const alt = advice?.alternatives.find((a) => a.tier.id === t.id);
              const irrelevant = !!advice?.recommended && !rec && !alt;
              return (
                <li key={t.id} className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${rec ? "border-brand/50 bg-brand-tint" : "border-line"} ${irrelevant ? "opacity-50" : ""}`}>
                  <div>
                    <p className="font-semibold text-ink">{t.label}</p>
                    <p className="text-xs text-soft">
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
        {b.fees.rules.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function StepsSection({ b }: { b: Brochure }) {
  return (
    <Section id="steps" kicker="Process" title="Step by step">
      <ol className="relative space-y-4 border-l border-line-strong pl-6">
        {b.process.map((s, i) => (
          <li key={s.id} className="relative">
            <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-md border border-line-strong bg-surface text-xs font-semibold text-soft tabular-nums">{i + 1}</span>
            <h3 className="font-semibold">{s.title}</h3>
            <Prose text={s.description} pages={s.sourcePages} className="mt-0.5" />
            {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="text-sm text-brand-strong hover:underline">{s.link.replace(/^https?:\/\//, "")} ↗</a>}
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-lg border border-line bg-canvas p-4">
        <h3 className="font-semibold">Important dates</h3>
        {b.importantDates.length === 0 ? (
          <p className="mt-1 text-sm">This brochure doesn't publish dates. Check the schedule notice on {b.meta.officialWebsites[0]?.replace(/^https?:\/\//, "")}.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {b.importantDates.map((d) => (
              <li key={d.id}><strong>{d.label}:</strong> <Marked text={d.date} />{d.endDate && <> – <Marked text={d.endDate} /></>}<Cite pages={d.sourcePages} /></li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function RoundsSection({ b }: { b: Brochure }) {
  const groups = useMemo(() => {
    const m = new Map<string, Brochure["rounds"]>();
    for (const r of b.rounds) m.set(r.tag ?? "General", [...(m.get(r.tag ?? "General") ?? []), r]);
    return [...m.entries()];
  }, [b.rounds]);
  return (
    <Section id="rounds" kicker="Rounds" title="What happens in each round">
      <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
        {groups.map(([tag, rules]) => (
          <div key={tag} className="rounded-lg border border-line bg-canvas p-3">
            <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-soft uppercase">{tag}</h3>
            <div className="space-y-2">
              {rules.map((r) => <RuleCard key={r.id} title={r.title} detail={r.detail} severity={r.severity} pages={r.sourcePages} />)}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function DocumentsSection({ entryKey, b, profile }: { entryKey: string; b: Brochure; profile: Profile | null }) {
  const storeKey = `neetpg-guide:docs:${entryKey}`;
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storeKey) ?? "[]"); } catch { return []; }
  });
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter((d) => d !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* memory only */ }
  };
  const docs = profile ? documentsFor(profile, b) : b.documents.map((doc) => ({ doc, certain: doc.appliesWhen === null }));
  const count = docs.filter((d) => done.includes(d.doc.id)).length;

  return (
    <Section
      id="documents"
      kicker="Checklist"
      title="Documents to carry"
      action={<button type="button" onClick={() => window.print()} className="no-print btn-secondary !py-1.5 !text-[13px]">Print checklist</button>}
    >
      <p className="mb-3 text-sm text-soft">
        {profile ? "Filtered to your profile." : "Showing every document. Add your profile to filter it."} Bring originals and one self-attested photocopy set. {count}/{docs.length} ready.
      </p>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="panel-accent h-full transition-all" style={{ width: `${docs.length ? (count / docs.length) * 100 : 0}%` }} /></div>
      <ul className="space-y-2">
        {docs.map(({ doc, certain }) => (
          <li key={doc.id}>
            <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 hover:border-line-strong">
              <input type="checkbox" checked={done.includes(doc.id)} onChange={() => toggle(doc.id)} className="mt-1 h-4 w-4 accent-[var(--brand)]" />
              <span className="text-sm">
                <span className={`font-medium text-ink ${done.includes(doc.id) ? "line-through opacity-60" : ""}`}>{doc.name}</span>
                {!certain && <span className="ml-2 rounded-md bg-warn-tint px-1.5 py-0.5 text-[11px] font-semibold text-warn">If applicable</span>}
                <Cite pages={doc.sourcePages} />
                {doc.detail && <span className="block text-soft"><Marked text={doc.detail} /></span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {b.admission.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function ReservationSection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
  const { policy, conversion } = b.reservation;
  const bars = policy
    ? [...policy.vertical, { category: "UR (open)", percent: 100 - policy.vertical.reduce((s, v) => s + v.percent, 0) }]
    : [];
  return (
    <Section id="reservation" kicker="Reservation" title="How seats are reserved">
      {verdict?.effectiveCategory && (
        <p className="mb-2 text-sm">You are counted as <strong>{verdict.effectiveCategory}</strong> in this state.</p>
      )}
      {policy ? (
        <>
          <p className="text-sm">Applies to: <strong><Marked text={policy.appliesTo} /></strong><Cite pages={policy.sourcePages} /></p>
          <div className="mt-4 flex h-10 overflow-hidden rounded-lg" role="img" aria-label={bars.map((v) => `${v.category} ${v.percent}%`).join(", ")}>
            {bars.map((v, i) => {
              const mine = verdict?.effectiveCategory && v.category.startsWith(verdict.effectiveCategory);
              return (
                <div key={v.category} style={{ width: `${v.percent}%`, opacity: verdict?.effectiveCategory && !mine ? 0.7 : 1 }}
                  className={`flex items-center justify-center text-[11px] font-semibold ${["bg-[var(--navy-a)] text-white", "bg-brand text-white", "bg-brand/60 text-white", "bg-brand/30 text-ink", "bg-line-strong text-ink"][i % 5]}`}>
                  {v.percent >= 5 ? `${v.category} ${v.percent}%` : ""}
                </div>
              );
            })}
          </div>
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
          {b.reservation.rules.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
        </div>
      </div>
    </Section>
  );
}

function ResignationSection({ b, verdict }: { b: Brochure; verdict: Verdict | null }) {
  const sectors = verdict?.sectors.length ? verdict.sectors : ["government", "private"];
  const ladder = b.resignation.ladder.filter((l) => l.sector === "all" || sectors.includes(l.sector));
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
                <p className="font-semibold text-ink">{l.stage}</p>
                <p className="text-xs text-soft"><Marked text={l.window} /></p>
                <Prose text={l.fees + (l.otherConsequence ? ` ${l.otherConsequence}` : "")} pages={l.sourcePages} className="mt-1" />
              </div>
              {l.securityDeposit && <span className="justify-self-start sm:justify-self-end"><StatusChip className={lost ? "bg-bad-tint text-bad" : "bg-good-tint text-good"}>Deposit {l.securityDeposit}</StatusChip></span>}
            </li>
          );
        })}
      </ol>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {b.resignation.rules.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function BondSection({ b }: { b: Brochure }) {
  const bond = b.serviceBond.bond;
  return (
    <Section id="bond" kicker="After PG" title="Service bond">
      {bond ? (
        <>
          <p className="text-sm">Applies to: <strong><Marked text={bond.appliesTo} /></strong><Cite pages={bond.sourcePages} /></p>
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
        {b.serviceBond.rules.map((r) => <RuleCard key={r.id} {...r} pages={r.sourcePages} />)}
      </div>
    </Section>
  );
}

function CollegesSection({ b, profile }: { b: Brochure; profile: Profile | null }) {
  const [q, setQ] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const dental = profile?.courseType === "dental";
  const needle = q.trim().toLowerCase();
  const rows = b.nodalCentres
    .map((n) => ({ n, colleges: (dental ? n.privateDental : n.privateMedical).filter((c) => c.toLowerCase().includes(needle) || n.centre.toLowerCase().includes(needle)) }))
    .filter((r) => r.colleges.length > 0);
  const total = b.nodalCentres.reduce((s, n) => s + (dental ? n.privateDental : n.privateMedical).length, 0);
  if (b.nodalCentres.length === 0 && b.disabilityCentres.length === 0) return null;
  return (
    <Section id={b.helpCentres.length ? "pwd-centres" : "colleges"} kicker={b.nodalCentres.length ? "Where to report" : "PwD candidates"} title={b.nodalCentres.length ? `Private ${dental ? "dental" : "medical"} colleges & their admission centres` : "Disability medical boards"}>
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
          <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-sm text-brand-strong hover:underline" aria-expanded={showPwd || !!profile?.pwd}>
            {showPwd || profile?.pwd ? "▾" : "▸"} Designated disability certification centres ({b.disabilityCentres.length})
          </button>
          {(showPwd || profile?.pwd) && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs text-soft"><tr><th className="py-1 pr-3">Centre</th><th className="pr-3">Location</th><th>Remarks</th></tr></thead>
                <tbody>
                  {b.disabilityCentres.map((d) => (
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
  const rows = b.helpCentres.filter((c) => (c.name + " " + c.address).toLowerCase().includes(needle));
  return (
    <Section id="colleges" kicker="Where to go" title="Help centres for document verification">
      <p className="mb-3 text-sm text-soft">Book an appointment while printing your registration slip, then visit with originals and one self-attested photocopy set.</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a city…" aria-label="Search help centres"
        className="mb-4 w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((c) => (
          <li key={c.id} className="rounded-lg border border-line p-4">
            <p className="font-semibold text-ink">{c.name}<Cite pages={c.sourcePages} /></p>
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
    <Section id="help" kicker="Contact" title="Help desk">
      <p className="text-sm">Hours: <strong><Marked text={h.hours} /></strong><Cite pages={h.sourcePages} /></p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {h.phones.map((p) => (
          <div key={p.label} className="rounded-lg border border-line p-4">
            <p className="font-semibold text-ink">{p.label}</p>
            <ul className="mt-1 space-y-0.5 text-sm">{p.numbers.map((n) => <li key={n}><a className="text-brand-strong hover:underline" href={`tel:+91${n.replace(/^0/, "")}`}>{n}</a></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {h.emails.map((e) => (
          <div key={e.label} className="rounded-lg bg-canvas p-3 text-sm">
            <p className="font-semibold text-ink">{e.label} email</p>
            {e.addresses.map((a) => <a key={a} href={`mailto:${a}`} className="block break-all text-brand-strong hover:underline">{a}</a>)}
          </div>
        ))}
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">{h.instructions.map((i) => <li key={i}><Marked text={i} /></li>)}</ul>
    </Section>
  );
}
