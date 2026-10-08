import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { locatePage, type SourceDocument } from "../../schema/stateBrochure";
import { SeatChip } from "../seats";
import type { ScheduleRef, SeatType } from "../../schema/stateBrochure";
import { ScheduleRefs } from "./ScheduleRefs";
import { markMetrics, splitSentences } from "../text";

/** Source documents of the brochure being shown, so citations can name the document. */
export const SourceDocsContext = createContext<SourceDocument[]>([]);

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

/** Short Indian-style amount: ₹2 lakh, ₹40 lakh, ₹30,000. */
export const inrShort = (n: number) =>
  n >= 100000 ? `₹${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} lakh` : inr(n);

/** "Brochure p. 4", or for multi-document sources "Eligibility criteria p. 1 · Help centres p. 1". */
export function citationLabel(pages: number[], documents: SourceDocument[]) {
  if (documents.length === 0) {
    return `Brochure ${pages.length === 1 ? `p. ${pages[0]}` : `pp. ${pages.join(", ")}`}`;
  }
  const byDoc = new Map<string, number[]>();
  for (const p of pages) {
    const hit = locatePage(documents, p);
    const key = hit?.doc.title ?? "Source";
    byDoc.set(key, [...(byDoc.get(key) ?? []), hit?.localPage ?? p]);
  }
  return [...byDoc.entries()].map(([t, ps]) => `${t} ${ps.length === 1 ? "p." : "pp."} ${ps.join(", ")}`).join(" · ");
}

export function Cite({ pages }: { pages: number[] }) {
  const documents = useContext(SourceDocsContext);
  if (pages.length === 0) return null;
  const label = citationLabel(pages, documents);
  return (
    <span
      className={`ml-1.5 inline rounded-[5px] bg-canvas px-1.5 py-0.5 align-middle text-[11px] font-medium text-soft [box-decoration-break:clone] ${label.length <= 28 ? "whitespace-nowrap" : ""}`}
      title={`Official source: ${label}`}
    >
      {label}
    </span>
  );
}

/** Text with its key figures (money, %, durations, dates) marked like a highlighter. */
export function Marked({ text }: { text: string }) {
  return (
    <>
      {markMetrics(text).map((p, i) => (p.mark ? <mark key={i} className="hl">{p.text}</mark> : p.text))}
    </>
  );
}

/**
 * Brochure prose made scannable: one sentence stays a line, several become bullets.
 * Key figures are highlighted and the citation follows the last line.
 */
export function Prose({ text, pages = [], className = "", clamp }: { text: string; pages?: number[]; className?: string; clamp?: number }) {
  const sentences = splitSentences(text);
  const [expanded, setExpanded] = useState(false);
  if (sentences.length < 2) {
    return <p className={`text-sm ${className}`}><Marked text={text} /><Cite pages={pages} /></p>;
  }
  const hidden = clamp && !expanded ? Math.max(0, sentences.length - clamp) : 0;
  // Clamp only when it hides at least two sentences; hiding one isn't worth a click.
  const shown = hidden >= 2 ? sentences.slice(0, clamp) : sentences;
  return (
    <div className={className}>
      <ul className="bullets space-y-1 text-sm">
        {shown.map((s, i) => (
          <li key={i}><Marked text={s} />{i === sentences.length - 1 && <Cite pages={pages} />}</li>
        ))}
      </ul>
      {hidden >= 2 && (
        <button type="button" onClick={() => setExpanded(true)} className="link mt-1 pl-4 text-sm">
          Show {hidden} more
        </button>
      )}
    </div>
  );
}

export function Section({
  id,
  title,
  kicker,
  children,
  action,
  collapsible = false,
  summary,
}: {
  id?: string;
  title: string;
  kicker?: string;
  children: ReactNode;
  action?: ReactNode;
  /** Reference sections start closed; they open on click or when the menu links to them. */
  collapsible?: boolean;
  /** One line shown under the title while a collapsible section is closed. */
  summary?: ReactNode;
}) {
  const [open, setOpen] = useState(!collapsible);
  // Following a menu link (#id) to a closed section opens it.
  useEffect(() => {
    if (!collapsible || !id) return;
    const check = () => window.location.hash === `#${id}` && setOpen(true);
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [collapsible, id]);
  const bodyId = id ? `${id}-body` : undefined;
  return (
    <section id={id} className="card scroll-mt-28">
      <div className={`flex flex-wrap items-end justify-between gap-2 px-5 py-4 sm:px-6 ${open ? "border-b border-line" : ""}`}>
        <div className="min-w-0">
          {kicker && <p className="text-xs text-soft">{kicker}</p>}
          {collapsible ? (
            <h2 className="text-lg sm:text-xl">
              <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={bodyId} className="flex items-center gap-2 text-left">
                <span aria-hidden className={`inline-block text-sm text-soft transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
                {title}
              </button>
            </h2>
          ) : (
            <h2 className="text-lg sm:text-xl">{title}</h2>
          )}
          {collapsible && !open && summary && <p className="mt-1 pl-6 text-sm text-soft">{summary}</p>}
        </div>
        {open && action}
      </div>
      {open && <div id={bodyId} className="p-5 sm:p-6">{children}</div>}
    </section>
  );
}

const severityDot = {
  info: "",
  warning: "bg-warn-tint text-warn",
  critical: "bg-bad-tint text-bad",
} as const;

const severityLabel = { info: null, warning: "Watch out", critical: "Critical" } as const;

export function RuleCard({
  title,
  detail,
  severity = "info",
  tag,
  seats,
  schedule,
  pages,
}: {
  title: string;
  detail: string;
  severity?: "info" | "warning" | "critical";
  tag?: string;
  seats?: SeatType[];
  schedule?: ScheduleRef[];
  pages: number[];
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      {(tag || seats || severityLabel[severity]) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <SeatChip seats={seats} />
          {severityLabel[severity] && <StatusChip className={severityDot[severity]}>{severityLabel[severity]}</StatusChip>}
          {tag && <span className="rounded-[5px] bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-soft">{tag}</span>}
        </div>
      )}
      <h3 className="text-[15px] tracking-tight">{title}</h3>
      {/* Warnings and critical rules always show in full; plain information can be shortened. */}
      <Prose text={detail} pages={pages} className="mt-1" clamp={severity === "info" ? 2 : undefined} />
      <ScheduleRefs refs={schedule} />
    </div>
  );
}

/** Small status chip with a leading dot (Attio-style). Colour comes from the caller. */
export function StatusChip({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function DraftBanner() {
  return (
    <div className="no-print rounded-lg border border-warn/30 bg-warn-tint px-4 py-2 text-sm text-warn">
      {import.meta.env.DEV ? (
        <><strong>Draft preview:</strong> this state hasn't been reviewed yet and is only visible on your local dev server.</>
      ) : (
        <><strong>Draft:</strong> this guide is built from the official documents but hasn't been checked by our team yet. Confirm every detail on the official website before you act on it.</>
      )}
    </div>
  );
}
