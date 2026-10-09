import { describe, expect, it } from "vitest";
import raw from "../../data/national/mcc-pg-2026.json";
import { ScheduleSchema } from "../schema/nationalSchedule";
import { minutesNow, nextDeadline, stageStatus, stageWhen, todayIso } from "./schedule";

const mcc = ScheduleSchema.parse(raw);
const r1 = mcc.rounds[0];
const stage = (key: string) => r1.stages.find((s) => s.key === key)!;

describe("MCC schedule helpers", () => {
  it("formats stage dates as '21st October 2026' with times", () => {
    expect(stageWhen(stage("registration"))).toBe("12th October 2026 - 21st October 2026, until 12:00 noon");
    expect(stageWhen(stage("choiceLocking"))).toBe("21st October 2026 (from 4:00 PM) - 22nd October 2026, until 10:00 AM");
    expect(stageWhen(stage("result"))).toBe("24th October 2026");
    const strayLock = mcc.rounds[3].stages.find((s) => s.key === "choiceLocking")!;
    expect(stageWhen(strayLock)).toBe("21st December 2026, 4:00 PM - 11:55 PM");
  });

  it("knows which stages are done, open or upcoming", () => {
    expect(stageStatus(stage("registration"), "2026-10-07")).toBe("upcoming");
    expect(stageStatus(stage("registration"), "2026-10-12")).toBe("now");
    expect(stageStatus(stage("registration"), "2026-10-21")).toBe("now");
    expect(stageStatus(stage("registration"), "2026-10-22")).toBe("done");
  });

  it("closes registration, payment and choices at the printed minute", () => {
    expect(stageStatus(stage("registration"), "2026-10-21", 719)).toBe("now");
    expect(stageStatus(stage("registration"), "2026-10-21", 720)).toBe("done");
    expect(stageStatus(stage("payment"), "2026-10-21", 899)).toBe("now");
    expect(stageStatus(stage("payment"), "2026-10-21", 900)).toBe("done");
    expect(stageStatus(stage("choiceFilling"), "2026-10-22", 599)).toBe("now");
    expect(stageStatus(stage("choiceFilling"), "2026-10-22", 600)).toBe("done");
  });

  it("waits for the printed locking opening time and includes the college cutoff in prose", () => {
    expect(stageStatus(stage("choiceLocking"), "2026-10-21", 959)).toBe("upcoming");
    expect(stageStatus(stage("choiceLocking"), "2026-10-21", 960)).toBe("now");
    const matrix = mcc.rounds[1].stages.find((s) => s.key === "seatMatrix")!;
    expect(stageWhen(matrix, true)).toContain("until 1:00 PM");
  });

  it("finds the next candidate deadline, ordering same-day times", () => {
    expect(nextDeadline(mcc, "2026-10-07")?.label).toBe("Round 1: registration closes");
    // 21-10: registration (12 noon) closes before payment (3 PM)
    expect(nextDeadline(mcc, "2026-10-21")?.label).toBe("Round 1: registration closes");
    // after 12 noon on 21-10, payment (3 PM) is next; after 4 PM, choice filling/locking on 22-10
    expect(nextDeadline(mcc, "2026-10-21", 13 * 60)?.label).toBe("Round 1: payment closes");
    expect(nextDeadline(mcc, "2026-10-21", 16 * 60)?.label).toBe("Round 1: choice filling closes");
    expect(nextDeadline(mcc, "2026-10-22")?.label).toBe("Round 1: choice filling closes");
    expect(nextDeadline(mcc, "2026-12-30")?.label).toBe("Online stray vacancy round: reporting closes");
    expect(nextDeadline(mcc, "2027-01-01")).toBeNull();
  });

  it("uses Indian time for today and now, whatever the viewer's time zone", () => {
    // 20:00 UTC on 21-10 is 01:30 IST on 22-10
    const t = new Date("2026-10-21T20:00:00Z");
    expect(todayIso(t)).toBe("2026-10-22");
    expect(minutesNow(t)).toBe(90);
  });
});
