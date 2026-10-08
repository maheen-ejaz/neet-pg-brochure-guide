import { Link, useParams } from "react-router-dom";
import { findSchedule } from "../../data/schedules";
import { Cite, DraftBanner, Prose, RuleCard, Section, SourceDocsContext, StatusChip } from "../components/ui";
import { CANDIDATE_STAGES, minutesNow, nextDeadline, scheduleDocs, stageStatus, stageWhen, todayIso, type StageStatus } from "../schedule";
import { DeadlineBadge } from "../components/DeadlineBadge";
import { formatDate } from "../text";
import { useProfile } from "../useProfile";
import { NotFound } from "./NotFound";

const STATUS: Record<StageStatus, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-canvas text-soft" },
  now: { label: "Open now", cls: "bg-good-tint text-good" },
  upcoming: { label: "Upcoming", cls: "bg-brand-tint text-brand-strong" },
};

export function SchedulePage() {
  const { key } = useParams();
  const entry = findSchedule(key);
  const { profile } = useProfile();
  if (!entry) return <NotFound />;
  const s = entry.schedule;
  const today = todayIso();
  const next = nextDeadline(s, today, minutesNow());
  const wrongCourse = profile?.courseType && !s.meta.courses.includes(profile.courseType);

  return (
    <SourceDocsContext.Provider value={scheduleDocs(s)}>
      <div className="space-y-6">
        {s.status === "draft" && <DraftBanner />}
        <header>
          <p className="text-sm text-soft"><Link to="/" className="text-brand-strong hover:underline">All states</Link> / All India Quota</p>
          <h1 className="mt-3 text-3xl sm:text-[40px]">{s.meta.shortTitle}</h1>
          <p className="mt-1 text-soft">
            {s.meta.authority}
            <Cite pages={s.meta.sourcePages} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {s.meta.tentative && <StatusChip className="bg-warn-tint text-warn">Tentative schedule</StatusChip>}
            <span className="text-sm text-soft">{s.meta.documentDateLabel} {formatDate(s.meta.documentDate)}</span>
            {s.meta.officialWebsites.map((w) => (
              <a key={w} href={w} target="_blank" rel="noreferrer" className="btn-secondary !py-1.5 !text-[13px]" title="MCC's official website (not printed on this schedule)">
                MCC website: {w.replace(/^https?:\/\/(www\.)?/, "")} ↗
              </a>
            ))}
          </div>
          <ul className="bullets mt-4 space-y-1 text-sm">
            {s.meta.scope.map((x) => <li key={x}>{x}</li>)}
            <li>For NEET-PG courses. This schedule doesn't mention MDS.</li>
          </ul>
        </header>

        {wrongCourse && (
          <p className="rounded-lg border border-warn/30 bg-warn-tint px-4 py-2 text-sm text-warn">
            <strong>Your profile says MDS.</strong> This schedule is for NEET-PG and doesn't mention MDS, so these may not be your dates.
          </p>
        )}

        <div className="panel-accent rounded-lg p-5">
          {next ? (
            <>
              <p className="text-sm opacity-80">Next deadline</p>
              <p className="font-heading mt-1 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                {formatDate(next.date)}{next.time ? `, ${next.time}` : ""}
              </p>
              <p className="mt-1 text-sm">{next.label}</p>
              <div className="mt-2"><DeadlineBadge date={next.date} time={next.time} kind={next.stage.key === "result" ? "event" : "deadline"} /></div>
              <p className="mt-3 text-xs opacity-80">Times are MCC server time. {s.meta.tentative ? "Dates are tentative." : ""}</p>
            </>
          ) : (
            <p className="text-sm">This schedule is over. Check the MCC website for later notices.</p>
          )}
        </div>

        {s.rounds.map((r) => (
          <Section key={r.id} id={r.round} kicker="All India Quota" title={r.name}>
            <ol className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {r.stages.map((st) => {
                const forCandidates = CANDIDATE_STAGES.includes(st.key);
                const status = stageStatus(st, today);
                return (
                  <li key={st.key} className={`grid gap-1 p-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-center sm:gap-3 ${forCandidates ? "" : "bg-canvas/60"}`}>
                    <span className={forCandidates ? "font-medium text-ink" : "text-sm text-soft"}>
                      {st.label}
                      {!forCandidates && <span className="ml-1.5 text-xs">(colleges/MCC)</span>}
                    </span>
                    <span className={`text-sm tabular-nums ${forCandidates ? "text-body" : "text-soft"}`}>{stageWhen(st)}</span>
                    {forCandidates ? (
                      <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                        <DeadlineBadge date={st.end ?? st.start} time={st.endTime} kind={st.key === "result" ? "event" : "deadline"} />
                        <StatusChip className={STATUS[status].cls}>{STATUS[status].label}</StatusChip>
                      </span>
                    ) : <span />}
                  </li>
                );
              })}
            </ol>
            <p className="mt-2 text-xs text-soft">Source<Cite pages={r.sourcePages} /></p>
          </Section>
        ))}

        <Section id="milestones" kicker="Key dates" title="Academic session">
          <ul className="space-y-1 text-sm">
            {s.milestones.map((m) => (
              <li key={m.id}><strong>{m.label}:</strong> {formatDate(m.date)}<Cite pages={m.sourcePages} /></li>
            ))}
          </ul>
        </Section>

        <Section id="notes" kicker="Read this" title="Things to know">
          <div className="grid gap-3 sm:grid-cols-2">
            {s.notes.map((n) => <RuleCard key={n.id} title={n.title} detail={n.detail} pages={n.sourcePages} />)}
          </div>
        </Section>

        <Section id="gaps" kicker="Be aware" title="Not in this schedule">
          <div className="grid gap-3 sm:grid-cols-2">
            {s.gaps.map((g) => (
              <div key={g.id} className="rounded-lg border border-dashed border-line-strong p-4">
                <h3 className="font-semibold">{g.title}</h3>
                <Prose text={g.detail} pages={g.sourcePages} className="mt-1" />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </SourceDocsContext.Provider>
  );
}
