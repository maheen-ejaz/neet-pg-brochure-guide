import { createContext, useContext, useState, type ReactNode } from "react";
import type { Brochure, SeatType } from "../schema/stateBrochure";

/**
 * Seat-type view of a state guide. Items carry an optional `seats` tag only when the source
 * limits them to certain seat types; untagged items apply to everyone and always show.
 */
export type SeatView = "all" | "government" | "mgmtNri";

const VIEW_SEATS: Record<Exclude<SeatView, "all">, SeatType[]> = {
  government: ["government"],
  mgmtNri: ["management", "nri"],
};

/** Shown in this view? Untagged items always are; tagged ones need a seat type the view covers. */
export function seatVisible(view: SeatView, seats: SeatType[] | undefined) {
  if (view === "all" || !seats) return true;
  return seats.some((s) => VIEW_SEATS[view].includes(s));
}

/** Items tagged for the view's seat types first (stable), then the general ones. */
export function seatOrder<T extends { seats?: SeatType[] }>(view: SeatView, items: T[]): T[] {
  const visible = items.filter((i) => seatVisible(view, i.seats));
  if (view === "all") return visible;
  return [...visible.filter((i) => i.seats), ...visible.filter((i) => !i.seats)];
}

export function seatLabel(seats: SeatType[]): string {
  const has = (s: SeatType) => seats.includes(s);
  if (has("government") && has("management") && has("nri")) return "All seat types";
  if (has("management") && has("nri")) return "Management & NRI";
  if (has("government") && has("management")) return "Government & management";
  if (has("government") && has("nri")) return "Government & NRI";
  if (has("nri")) return "NRI only";
  if (has("management")) return "Management only";
  return "Government seats only";
}

/** Small label on items limited to certain seat types. NRI-only items stand out most. */
export function SeatChip({ seats }: { seats?: SeatType[] }) {
  if (!seats) return null;
  const nriOnly = seats.length === 1 && seats[0] === "nri";
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
        nriOnly ? "bg-brand-tint text-brand-strong" : "border border-line-strong text-body"
      }`}
    >
      {seatLabel(seats)}
    </span>
  );
}

export const SeatViewContext = createContext<SeatView>("all");

export function useSeatView() {
  const view = useContext(SeatViewContext);
  return {
    view,
    show: (item: { seats?: SeatType[] }) => seatVisible(view, item.seats),
    order: <T extends { seats?: SeatType[] }>(items: T[]) => seatOrder(view, items),
  };
}

const STORE_KEY = "neetpg-guide:seat-view";

/** Remembered per browser; candidates who said they're NRI start on Management & NRI. */
export function useStoredSeatView(isNri: boolean | null | undefined) {
  const [view, setView] = useState<SeatView>(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === "all" || saved === "government" || saved === "mgmtNri") return saved;
    } catch { /* storage unavailable */ }
    return isNri ? "mgmtNri" : "all";
  });
  const choose = (v: SeatView) => {
    setView(v);
    try { localStorage.setItem(STORE_KEY, v); } catch { /* memory only */ }
  };
  return [view, choose] as const;
}

export function SeatViewSwitch({
  view,
  onChange,
  terms,
}: {
  view: SeatView;
  onChange: (v: SeatView) => void;
  terms: Brochure["meta"]["seatTerms"];
}) {
  const options: { value: SeatView; label: string; hint?: string }[] = [
    { value: "all", label: "All seats" },
    { value: "government", label: "Government", hint: terms?.government },
    { value: "mgmtNri", label: "Management & NRI", hint: terms ? [terms.management, terms.nri].filter(Boolean).join(" · ") : undefined },
  ];
  return (
    <div className="no-print">
      <div role="radiogroup" aria-label="Seat type" className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-canvas p-1">
        {options.map((o) => {
          const active = view === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.hint}
              onClick={() => onChange(o.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-surface font-semibold text-ink shadow-[var(--shadow)]" : "text-soft hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SeatViewBanner({ view, terms }: { view: SeatView; terms: Brochure["meta"]["seatTerms"] }): ReactNode {
  if (view === "all") return null;
  const what =
    view === "mgmtNri"
      ? terms ? [terms.management, terms.nri].filter(Boolean).join(" and ") : "management and NRI seats"
      : terms?.government ?? "government seats";
  const hidden = view === "mgmtNri" ? "government seats" : "management or NRI seats";
  return (
    <p className="text-sm text-soft">
      Showing what applies to <strong className="text-ink">{what}</strong>, plus everything that applies to all applicants.
      Items only for {hidden} are hidden.
    </p>
  );
}
