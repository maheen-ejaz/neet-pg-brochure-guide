/**
 * Turns brochure prose into scannable pieces: sentences for bullet lists, and the
 * numbers worth highlighting (money, percentages, durations, dates, deadlines).
 */

// Abbreviations that end in a full stop but don't end a sentence.
const ABBREV = /\b(?:i\.e|e\.g|etc|Govt|No|Nos|Dr|Rs|St|vs|viz|approx|p|pp|Sr|Jr|Mr|Mrs|Ms)\.$/i;

/** Split text into sentences, keeping abbreviations like "Govt." and "i.e." intact. */
export function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=["“(₹A-Z0-9])/);
  const out: string[] = [];
  for (const part of parts) {
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += " " + part;
    else out.push(part);
  }
  return out.map((s) => s.trim()).filter(Boolean);
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";

const METRIC = new RegExp(
  [
    // Money: ₹40 lakh, ₹3,000, Rs. 5,000, US$ 50,000
    String.raw`(?:₹|Rs\.?\s?|US\$\s?)\d[\d,]*(?:\.\d+)?(?:\s?(?:lakhs?|crores?))?`,
    // Percentages: 50%, 27 %, 40 percent
    String.raw`(?<![\d.])\d+(?:\.\d+)?\s?(?:%|percent\b)`,
    // Dates: 2026-10-01, 30/09/2026, 1 April 2026, 30 September 2026
    String.raw`(?<![\d/-])\d{4}-\d{2}-\d{2}(?![\d/-])`,
    String.raw`(?<![\d/-])\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?![\d/-])`,
    String.raw`\d{1,2}(?:st|nd|rd|th)?\s(?:${MONTHS})(?:,?\s\d{4})?`,
    // Durations that carry consequences: 2 years (bond), 3 months, 2 days (resignation window).
    // Clock times, character/digit counts and "one term" aren't highlighted: they're detail, not decisions.
    String.raw`(?<![\d/-])\d+(?:\s?[–-]\s?\d+)?[\s-](?:working\s)?(?:years?|months?|weeks?|days?)\b`,
    String.raw`\b(?:one|two|three|four|five|six|seven|ten)[\s-](?:years?|months?)\b`,
  ].join("|"),
  "g",
);

export type Piece = { text: string; mark: boolean };

/** Split text into plain and highlighted pieces. */
export function markMetrics(text: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(METRIC)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i), mark: false });
    out.push({ text: m[0], mark: true });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), mark: false });
  return out;
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "2026-10-21" → "21st October 2026". Every date the app shows uses this form. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${ordinal(Number(m[3]))} ${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : iso;
}

/** "2026-10-21" → "21st October": for tables and lists whose heading already shows the year. */
export function formatDateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${ordinal(Number(m[3]))} ${MONTH_NAMES[Number(m[2]) - 1]}` : iso;
}

/** The one year shared by all these ISO dates, or null if they span years (then show full dates). */
export function sharedYear(isos: (string | undefined)[]): string | null {
  const years = new Set(isos.filter((d): d is string => !!d).map((d) => d.slice(0, 4)));
  return years.size === 1 ? [...years][0] : null;
}

/** "21st October 2026 - 22nd October 2026" (or one date when start and end match). */
export const formatRange = (start: string, end?: string) =>
  end && end !== start ? `${formatDate(start)} - ${formatDate(end)}` : formatDate(start);

/** "2026-09-30" → "30-09-2026": only for date inputs, which candidates type as DD-MM-YYYY. */
export function formatDateNumeric(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** "30-09-2026" (or 30/09/2026, 30.09.2026) → "2026-09-30", or null if it isn't a real date. */
export function parseDate(text: string): string | null {
  const m = /^\s*(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\s*$/.exec(text);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
