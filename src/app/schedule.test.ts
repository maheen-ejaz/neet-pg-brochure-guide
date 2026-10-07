import { describe, expect, it } from "vitest";
import raw from "../../data/national/mcc-pg-2026.json";
import { ScheduleSchema } from "../schema/nationalSchedule";
import { nextDeadline, stageStatus, stageWhen } from "./schedule";

const mcc = ScheduleSchema.parse(raw);
const r1 = mcc.rounds[0];
const stage = (key: string) => r1.stages.find((s) => s.key === key)!;

describe("MCC schedule helpers", () => {
  it("formats stage dates as DD-MM-YYYY with times", () => {
    expect(stageWhen(stage("registration"))).toBe("12-10-2026 – 21-10-2026, until 12:00 noon");
    expect(stageWhen(stage("choiceLocking"))).toBe("21-10-2026 (from 4:00 PM) – 22-10-2026, until 10:00 AM");
    expect(stageWhen(stage("result"))).toBe("24-10-2026");
  });

  it("knows which stages are done, open or upcoming", () => {
    expect(stageStatus(stage("registration"), "2026-10-07")).toBe("upcoming");
    expect(stageStatus(stage("registration"), "2026-10-12")).toBe("now");
    expect(stageStatus(stage("registration"), "2026-10-21")).toBe("now");
    expect(stageStatus(stage("registration"), "2026-10-22")).toBe("done");
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
});
