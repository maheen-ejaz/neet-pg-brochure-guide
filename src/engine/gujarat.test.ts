import { describe, expect, it } from "vitest";
import raw from "../../data/states/gujarat-2026.json";
import { BrochureSchema } from "../schema/stateBrochure";
import { adviseDeposit, checkEligibility, documentsFor } from "./eligibility";
import { ABROAD, NOT_IN_SERVICE, type Profile } from "./profile";

const gj = BrochureSchema.parse(raw);

const base: Profile = {
  air: 20000,
  courseType: "clinical",
  mbbsState: "Gujarat",
  mbbsInstitution: null,
  domicileState: "Gujarat",
  schoolState: "Gujarat",
  tenYearStudyState: null,
  birthState: "Gujarat",
  nriLink: "none",
  parentRouteState: "none",
  category: "UR",
  pwd: false,
  inServiceState: NOT_IN_SERVICE,
  inServiceListed: null,
  priorAdmissionState: NOT_IN_SERVICE,
  internshipCompletion: "2026-06-30",
  currentlyInPG: false,
  nationality: "indian",
  specialities: [],
};
const check = (p: Partial<Profile>) => checkEligibility({ ...base, ...p }, gj);
const outside = { mbbsState: "Karnataka" };

describe("Gujarat 2026 eligibility", () => {
  it("Gujarat-university graduate is eligible", () => {
    expect(check({}).status).toBe("eligible");
  });

  it("outside-Gujarat MBBS with Gujarat 12th and birth is eligible", () => {
    expect(check({ ...outside, domicileState: "Karnataka" }).status).toBe("eligible");
  });

  it("outside-Gujarat MBBS with Gujarat 12th and domicile (born elsewhere) is eligible", () => {
    expect(check({ ...outside, birthState: "Rajasthan" }).status).toBe("eligible");
  });

  it("foreign MBBS with Gujarat roots is eligible", () => {
    expect(check({ mbbsState: ABROAD }).status).toBe("eligible");
  });

  it("outside-Gujarat MBBS with 12th outside Gujarat is ineligible", () => {
    expect(check({ ...outside, schoolState: "Karnataka" }).status).toBe("ineligible");
  });

  it("outside-Gujarat MBBS, school in Gujarat, but neither born nor domiciled is ineligible", () => {
    expect(check({ ...outside, birthState: "Delhi", domicileState: "Delhi" }).status).toBe("ineligible");
  });

  it("NRI without the Gujarat route is limited to NRI quota", () => {
    const v = check({ ...outside, schoolState: "Karnataka", nriLink: "parent" });
    expect(v.status).toBe("restricted");
    expect(v.quotas).toEqual(["NRI"]);
  });

  it("NRI who also meets the Gujarat route has no quota restriction", () => {
    expect(check({ nriLink: "parent" }).quotas).toBeNull();
  });

  it("missing school state makes an outside-Gujarat candidate incomplete, not eligible", () => {
    const v = check({ ...outside, schoolState: null });
    expect(v.status).toBe("incomplete");
    expect(v.missingInfo).toContain("where you did 12th standard");
  });

  it("internship after 30 Sep 2026 is ineligible", () => {
    expect(check({ internshipCompletion: "2026-10-01" }).status).toBe("ineligible");
  });

  it("MDS is not covered by this year's notice", () => {
    const v = check({ courseType: "dental" });
    expect(v.status).toBe("notCovered");
    expect(adviseDeposit(v, gj).recommended).toBeNull();
  });

  it("Rule 4(4): only a prior admission through Gujarat counselling bars you", () => {
    expect(check({ priorAdmissionState: "Gujarat" }).status).toBe("ineligible");
    // Currently in a PG seat from another state's counselling isn't covered by Rule 4(4).
    expect(check({ currentlyInPG: true, priorAdmissionState: "Maharashtra" }).status).toBe("eligible");
  });

  it("in-service needs Gujarat's criteria (NOC), not just employment", () => {
    const applies = (p: Partial<Profile>) => check(p).reasons.filter((r) => r.match === "applies").map((r) => r.rule.id);
    expect(applies({ inServiceState: "Gujarat", inServiceListed: true })).toContain("elig-in-service");
    expect(applies({ inServiceState: "Gujarat", inServiceListed: false })).not.toContain("elig-in-service");
  });

  it("PwD candidates get UDID and affidavit documents", () => {
    const ids = documentsFor({ ...base, pwd: true }, gj).map((d) => d.doc.id);
    expect(ids).toEqual(expect.arrayContaining(["doc-pwd", "doc-udid", "doc-pwbd-affidavits"]));
  });

  it("everyone eligible pays the single ₹25,000 deposit", () => {
    expect(adviseDeposit(check({}), gj).recommended?.amountInr).toBe(25000);
  });

  it("documents follow the profile", () => {
    const ids = (p: Partial<Profile>) => documentsFor({ ...base, ...p }, gj).map((d) => d.doc.id);
    expect(ids({})).not.toContain("doc-12th");
    expect(ids({ ...outside })).toEqual(expect.arrayContaining(["doc-12th"]));
    expect(ids({ ...outside })).not.toContain("doc-domicile");
    expect(ids({ ...outside, birthState: "Delhi" })).toContain("doc-domicile");
    expect(ids({ category: "OBC" })).toEqual(expect.arrayContaining(["doc-caste", "doc-ncl"]));
    expect(ids({ nriLink: "parent" })).toContain("doc-nri");
  });

  it("an NRI legal guardian counts when parents are absent; another relative doesn't", () => {
    const outsideNoRoute = { mbbsState: "Karnataka", schoolState: "Karnataka", birthState: "Karnataka", domicileState: "Karnataka" };
    expect(check({ ...outsideNoRoute, nriLink: "guardian" }).status).not.toBe("ineligible");
    expect(check({ ...outsideNoRoute, nriLink: "relative" }).status).toBe("ineligible");
  });

  it("MDS candidates get 'not covered', never 'ineligible'", () => {
    expect(check({ courseType: "dental", mbbsState: "Karnataka", schoolState: "Karnataka", birthState: "Karnataka", domicileState: "Karnataka" }).status).toBe("notCovered");
  });
});
