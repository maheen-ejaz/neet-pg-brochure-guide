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
    // Times: 10:00 AM, 5 PM
    String.raw`\d{1,2}(?::\d{2})?\s?(?:AM|PM|am|pm|a\.m\.|p\.m\.)`,
    // Durations and counts with a unit: 2 years, 3 months, 6–12 characters, 14-digit
    String.raw`(?<![\d/-])\d+(?:\s?[–-]\s?\d+)?[\s-](?:working\s)?(?:years?|months?|weeks?|days?|hours?|minutes?|terms?|characters|digits?)\b`,
    // Spelled-out short durations: one year, two years
    String.raw`\b(?:one|two|three|four|five|six|seven|ten)[\s-](?:years?|months?|weeks?|days?|terms?)\b`,
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

/** "2026-09-30" → "30-09-2026". Every date the app shows is DD-MM-YYYY. */
export function formatDate(iso: string): string {
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
