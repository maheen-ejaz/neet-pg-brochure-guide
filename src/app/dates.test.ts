import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDate, parseDate } from "./text";

/** Every date shown in the app is DD-MM-YYYY. Machine fields (engine/ISO) are exempt. */
const MACHINE_KEYS = new Set(["id", "date", "endDate", "after", "onOrBefore", "url", "dir", "link"]);
const MONTHS = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const BAD_DATES = [
  /(?<![\d/.-])\d{1,2}[/.]\d{1,2}[/.]\d{4}(?![\d/-])/, // 30/09/2026, 30.09.2026
  /(?<![\d/.-])\d-\d{1,2}-\d{4}\b|(?<![\d/.-])\d{1,2}-\d-\d{4}\b/, // unpadded 1-4-2026
  /(?<![\d-])\d{4}-\d{2}-\d{2}(?![\d-])/, // ISO in text
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?[ -](?:${MONTHS})\\b`, "i"), // 30 September, 06-Oct
  new RegExp(`\\b(?:${MONTHS})\\.? \\d{1,2}(?:st|nd|rd|th)?,? \\d{4}\\b`, "i"), // September 30, 2026
];

function strings(o: unknown, at: string, out: { at: string; text: string }[]) {
  if (typeof o === "string") out.push({ at, text: o });
  else if (Array.isArray(o)) o.forEach((v, i) => strings(v, `${at}[${i}]`, out));
  else if (o && typeof o === "object")
    for (const [k, v] of Object.entries(o)) if (!MACHINE_KEYS.has(k)) strings(v, `${at}.${k}`, out);
  return out;
}

describe("dates are DD-MM-YYYY", () => {
  const dir = path.join(process.cwd(), "data", "states");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    it(file, () => {
      const offenders = strings(JSON.parse(readFileSync(path.join(dir, file), "utf8")), "", [])
        .filter(({ text }) => BAD_DATES.some((re) => re.test(text)))
        .map(({ at, text }) => `${at}: ${text}`);
      expect(offenders).toEqual([]);
    });
  }

  it("formats ISO dates for display", () => {
    expect(formatDate("2026-09-30")).toBe("30-09-2026");
  });

  it("parses typed dates and rejects impossible ones", () => {
    expect(parseDate("30-09-2026")).toBe("2026-09-30");
    expect(parseDate("1/4/2026")).toBe("2026-04-01");
    expect(parseDate("31-02-2026")).toBeNull();
    expect(parseDate("2026-09-30")).toBeNull();
    expect(parseDate("30-09")).toBeNull();
  });
});
