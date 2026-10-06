import { createContext, useContext, type ReactNode } from "react";
import { locatePage, type SourceDocument } from "../../schema/stateBrochure";

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
      className="ml-1.5 inline rounded-full border border-line bg-surface px-2 py-0.5 align-middle text-[11px] font-medium text-soft [box-decoration-break:clone]"
      title={`Official source: ${label}`}
    >
      {label}
    </span>
  );
}

export function Section({
  id,
  title,
  kicker,
  children,
  action,
}: {
  id?: string;
  title: string;
  kicker?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          {kicker && <p className="text-xs font-semibold tracking-wide text-brand uppercase">{kicker}</p>}
          <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const severityStyles = {
  info: "border-line bg-surface",
  warning: "border-warn/30 bg-warn-tint/50",
  critical: "border-bad/30 bg-bad-tint/50",
} as const;

const severityLabel = { info: null, warning: "Watch out", critical: "Critical" } as const;

export function RuleCard({
  title,
  detail,
  severity = "info",
  tag,
  pages,
}: {
  title: string;
  detail: string;
  severity?: "info" | "warning" | "critical";
  tag?: string;
  pages: number[];
}) {
  return (
    <div className={`rounded-xl border p-4 ${severityStyles[severity]}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {tag && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold text-brand-strong">{tag}</span>}
        {severityLabel[severity] && (
          <span className={`text-[11px] font-semibold uppercase ${severity === "critical" ? "text-bad" : "text-warn"}`}>
            {severityLabel[severity]}
          </span>
        )}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm">
        {detail}
        <Cite pages={pages} />
      </p>
    </div>
  );
}

export function DraftBanner() {
  return (
    <div className="no-print rounded-xl border border-warn/40 bg-warn-tint px-4 py-2 text-sm text-warn">
      <strong>Draft preview:</strong> this state hasn't been reviewed yet and is only visible on your local dev server.
    </div>
  );
}
