import { describe, expect, it } from "vitest";
import type { SeatType } from "../schema/stateBrochure";
import { seatLabel, seatOrder, seatVisible } from "./seats";

type Item = { id: string; seats?: SeatType[] };

const gov: Item = { id: "g", seats: ["government"] };
const nri: Item = { id: "n", seats: ["nri"] };
const mgmt: Item = { id: "m", seats: ["management", "nri"] };
const all: Item = { id: "a" };

describe("seat view", () => {
  it("untagged items show in every view", () => {
    for (const v of ["all", "government", "mgmtNri"] as const) expect(seatVisible(v, undefined)).toBe(true);
  });

  it("Management & NRI hides government-only items and keeps management/NRI ones", () => {
    expect(seatOrder("mgmtNri", [all, gov, nri, mgmt]).map((i) => i.id)).toEqual(["n", "m", "a"]);
  });

  it("Government hides management/NRI-only items", () => {
    expect(seatOrder("government", [all, gov, nri, mgmt]).map((i) => i.id)).toEqual(["g", "a"]);
  });

  it("All seats keeps the original order", () => {
    expect(seatOrder("all", [all, gov, nri, mgmt]).map((i) => i.id)).toEqual(["a", "g", "n", "m"]);
  });

  it("labels", () => {
    expect(seatLabel(["nri"])).toBe("NRI only");
    expect(seatLabel(["management"])).toBe("Management only");
    expect(seatLabel(["management", "nri"])).toBe("Management & NRI");
    expect(seatLabel(["government"])).toBe("Government seats only");
  });
});
