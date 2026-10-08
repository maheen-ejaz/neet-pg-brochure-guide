import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDate, formatRange, parseDate } from "./text";

/** Every date shown in the app reads "21st October 2026". Machine fields (engine/ISO) are exempt. */
const MACHINE_KEYS = new Set(["id", "date", "endDate", "start", "end", "documentDate", "after", "onOrBefore", "url", "dir", "link"]);
const MONTHS = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const BAD_DATES = [
  /(?<![\d/.-])\d{1,2}[/.-]\d{1,2}[/.-]\d{4}(?![\d/-])/, // 30-09-2026, 30/09/2026, 30.09.2026
  /\b(?:1[123]|\d*[04-9])(?:st|nd|rd)\b|\b\d*1th\b(?<!1[1]th)|\b\d*2th\b(?<!12th)|\b\d*3th\b(?<!13th)/, // wrong ordinal (11st, 4nd, 21th)
  /(?<![\d-])\d{4}-\d{2}-\d{2}(?![\d-])/, // ISO in text
  new RegExp(`\\b\\d{1,2}[ -](?:${MONTHS})\\b`, "i"), // 30 September, 06-Oct (no ordinal)
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th) (?:${MONTHS})\\b(?! \\d{4})`, "i"), // 21st October with no year
  new RegExp(`\\b(?:${MONTHS})\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}\\b`, "i"), // September 30, 2026
];

function strings(o: unknown, at: string, out: { at: string; text: string }[]) {
  if (typeof o === "string") out.push({ at, text: o });
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, `${at}[${i}]`, out));
  else if (o && typeof o === "object")
    for (const [k, v] of Object.entries(o)) if (!MACHINE_KEYS.has(k)) strings(v, `${at}.${k}`, out);
  return out;
}

describe("dates read like '21st October 2026'", () => {
  const files = ["states", "national"].flatMap((d) => {
    const dir = path.join(process.cwd(), "data", d);
    try {
      return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ dir, file: f, label: `${d}/${f}` }));
    } catch {
      return [];
    }
  });
  for (const { dir, file, label } of files) {
    it(label, () => {
      const offenders = strings(JSON.parse(readFileSync(path.join(dir, file), "utf8")), "", [])
        .filter(({ text }) => BAD_DATES.some((re) => re.test(text)))
        .map(({ at, text }) => `${at}: ${text}`);
      expect(offenders).toEqual([]);
    });
  }

  it("formats ISO dates as '21st October 2026', with correct ordinals", () => {
    expect(formatDate("2026-10-21")).toBe("21st October 2026");
    const days = ["01", "02", "03", "04", "11", "12", "13", "21", "22", "23", "31"].map((d) => formatDate(`2026-01-${d}`).split(" ")[0]);
    expect(days).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "31st"]);
    expect(formatRange("2026-10-21", "2026-10-22")).toBe("21st October 2026 - 22nd October 2026");
    expect(formatRange("2026-10-21")).toBe("21st October 2026");
  });

  it("parses typed dates and rejects impossible ones", () => {
    expect(parseDate("30-09-2026")).toBe("2026-09-30");
    expect(parseDate("1/4/2026")).toBe("2026-04-01");
    expect(parseDate("31-02-2026")).toBeNull();
    expect(parseDate("2026-09-30")).toBeNull();
    expect(parseDate("30-09")).toBeNull();
  });
});
