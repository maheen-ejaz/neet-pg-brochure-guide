import { describe, expect, it } from "vitest";
import { badgeFor, daysBetween, kindFromLabel, timeFromLabel } from "./deadline";

// Times below are IST (+05:30). MCC and state documents use Indian time.
const at = (iso: string) => new Date(iso + "+05:30");

describe("deadline badges", () => {
  it("counts down 3, 2, 1 days, then the last day", () => {
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-18T09:00"))?.label).toBe("3 Days Remaining");
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-19T09:00"))?.label).toBe("2 Days Remaining");
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-20T09:00"))?.label).toBe("1 Day Remaining");
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-21T09:00"))?.label).toBe("Last Day Today");
  });

  it("shows nothing more than 3 days out or after the date", () => {
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-17T23:59"))).toBeNull();
    expect(badgeFor("2026-10-21", undefined, "deadline", at("2026-10-22T00:01"))).toBeNull();
  });

  it("counts HH:MM to the printed time on the last day, then disappears", () => {
    expect(badgeFor("2026-10-21", "12:00 noon", "deadline", at("2026-10-21T09:15"))?.countdown).toBe("02:45");
    expect(badgeFor("2026-10-21", "3:00 PM", "deadline", at("2026-10-21T14:59"))?.countdown).toBe("00:01");
    expect(badgeFor("2026-10-21", "3:00 PM", "deadline", at("2026-10-21T15:00"))).toBeNull();
  });

  it("counts to 11:59 PM when no time is printed", () => {
    const b = badgeFor("2026-11-02", undefined, "deadline", at("2026-11-02T20:30"));
    expect(b?.countdown).toBe("03:29");
    expect(b?.endOfDay).toBe(true);
  });

  it("uses Indian time even for viewers elsewhere", () => {
    // 19:00 UTC on 20-10 is 00:30 IST on 21-10: the last day has started.
    expect(badgeFor("2026-10-21", undefined, "deadline", new Date("2026-10-20T19:00:00Z"))?.label).toBe("Last Day Today");
  });

  it("events say Today with no countdown", () => {
    expect(badgeFor("2026-10-24", undefined, "event", at("2026-10-24T08:00"))).toEqual({ level: 0, label: "Today" });
  });

  it("reads kinds and times from labels", () => {
    expect(kindFromLabel("Document verification slot booking opens (PG Dental)")).toBe("event");
    expect(kindFromLabel("Online registration & document upload (until 5:00 PM)")).toBe("deadline");
    expect(timeFromLabel("Buy PIN online (until 3:00 PM)")).toBe("3:00 PM");
    expect(timeFromLabel("NEET-MDS internship cut-off")).toBeUndefined();
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});

describe("date kinds", () => {
  it("brochure notification and service measurement dates are events, not submission deadlines", () => {
    expect(kindFromLabel("Notification date")).toBe("event");
    expect(kindFromLabel("Service eligibility measurement date")).toBe("event");
    expect(kindFromLabel("Last date to submit the online application")).toBe("deadline");
  });
  it("'issued on or after' starts something, so it's an event", () => {
    expect(kindFromLabel("EWS and OBC certificates: issued on or after")).toBe("event");
    expect(kindFromLabel("Internship completion deadline (MDS)")).toBe("deadline");
  });
});
