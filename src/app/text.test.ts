import { describe, expect, it } from "vitest";
import { markMetrics, splitSentences } from "./text";

const marks = (s: string) => markMetrics(s).filter((p) => p.mark).map((p) => p.text);

describe("splitSentences", () => {
  it("splits on sentence ends", () => {
    expect(splitSentences("Free exit. Government colleges refund all fees. Private colleges refund tuition paid.")).toEqual([
      "Free exit.",
      "Government colleges refund all fees.",
      "Private colleges refund tuition paid.",
    ]);
  });

  it("keeps abbreviations inside a sentence", () => {
    expect(splitSentences("Check the Govt. Order No. I/1405837/2026 dated 23/07/2026. Then pay.")).toEqual([
      "Check the Govt. Order No. I/1405837/2026 dated 23/07/2026.",
      "Then pay.",
    ]);
    expect(splitSentences("Fee receipt (one term, i.e. 6 months) and documents.")).toHaveLength(1);
  });

  it("leaves a single sentence alone", () => {
    expect(splitSentences("50% of the tuition fee paid is forfeited.")).toEqual(["50% of the tuition fee paid is forfeited."]);
  });
});

describe("markMetrics", () => {
  it("marks money, percentages, durations and dates", () => {
    expect(marks("Bond for 2 years (₹40 lakh for a degree, ₹20 lakh for a diploma).")).toEqual(["2 years", "₹40 lakh", "₹20 lakh"]);
    expect(marks("50% of the tuition fee paid is forfeited.")).toEqual(["50%"]);
    expect(marks("Complete it on or before 30 September 2026 or 30/09/2026.")).toEqual(["30 September 2026", "30/09/2026"]);
    // Counts and clock times aren't highlighted; money, percentages, dates and consequential durations are.
    expect(marks("Fresh registration with ₹3,000 is mandatory, 6–12 characters, 14-digit PIN, by 3:00 PM.")).toEqual(["₹3,000"]);
    expect(marks("Serve 2 years or pay; resign 2 days before; one term fee.")).toEqual(["2 years", "2 days"]);
  });

  it("marks ISO dates whole and ignores order numbers", () => {
    expect(marks("Buy PIN online: 2026-10-01 – 2026-10-08.")).toEqual(["2026-10-01", "2026-10-08"]);
    expect(marks("Govt. Order No. I/1405837/2026 dated 23/07/2026.")).toEqual(["23/07/2026"]);
  });

  it("leaves exam names, years and round numbers alone", () => {
    expect(marks("You must have qualified NEET-PG 2026 under the RPwD Act 2016 for Round 1 in 2026-27.")).toEqual([]);
  });

  it("keeps the full text", () => {
    const s = "Pay ₹28,000 within 3 days.";
    expect(markMetrics(s).map((p) => p.text).join("")).toBe(s);
  });
});
