import { describe, expect, it } from "vitest";
import raw from "../../data/states/uttar-pradesh-2026.json";
import { BrochureSchema } from "../schema/stateBrochure";
import { adviseDeposit, checkEligibility, documentsFor } from "./eligibility";
import { ABROAD, NOT_IN_SERVICE, type Profile } from "./profile";

const up = BrochureSchema.parse(raw);

const base: Profile = {
  air: 12000,
  courseType: "clinical",
  mbbsState: "Uttar Pradesh",
  mbbsInstitution: null,
  domicileState: "Uttar Pradesh",
  schoolState: "Uttar Pradesh",
  birthState: "Uttar Pradesh",
  nri: false,
  category: "UR",
  pwd: false,
  inServiceState: NOT_IN_SERVICE,
  inServiceListed: null,
  priorAdmissionState: NOT_IN_SERVICE,
  internshipCompletion: "2026-03-31",
  currentlyInPG: false,
  nationality: "indian",
  specialities: ["Radiodiagnosis"],
};

const check = (p: Partial<Profile>) => checkEligibility({ ...base, ...p }, up);

describe("UP 2026 eligibility", () => {
  it("UP graduate is eligible for government and private", () => {
    const v = check({});
    expect(v.status).toBe("eligible");
    expect(v.sectors).toEqual(["government", "private"]);
  });

  it.each(up.eligibility.listedHomeInstitutions.names)("%s graduate is private-only", (name) => {
    const v = check({ mbbsInstitution: name });
    expect(v.status).toBe("restricted");
    expect(v.sectors).toEqual(["private"]);
  });

  it("outside-UP graduate is private-only", () => {
    expect(check({ mbbsState: "Bihar", domicileState: "Bihar" }).sectors).toEqual(["private"]);
  });

  it("foreign medical graduate is private-only", () => {
    expect(check({ mbbsState: ABROAD }).sectors).toEqual(["private"]);
  });

  it("MD/MS internship completing after 30 Sep 2026 is ineligible", () => {
    expect(check({ internshipCompletion: "2026-10-01" }).status).toBe("ineligible");
    expect(check({ internshipCompletion: "2026-09-30" }).status).toBe("eligible");
  });

  it("MDS internship completing after 31 May 2026 is ineligible", () => {
    expect(check({ courseType: "dental", internshipCompletion: "2026-06-01" }).status).toBe("ineligible");
    expect(check({ courseType: "dental", internshipCompletion: "2026-05-31" }).status).toBe("eligible");
  });

  it("candidate already in a PG course is ineligible", () => {
    expect(check({ currentlyInPG: true }).status).toBe("ineligible");
  });

  it("only candidates meeting UP's PMHS criteria can take state quota DNB", () => {
    expect(check({}).excludedCourses).toEqual(["DNB"]);
    expect(check({ inServiceState: "Uttar Pradesh", inServiceListed: true }).excludedCourses).toEqual([]);
    // Employed in UP but not on the PMHS list is not in-service for this brochure.
    expect(check({ inServiceState: "Uttar Pradesh", inServiceListed: false }).excludedCourses).toEqual(["DNB"]);
    // Employed in UP but criteria unanswered: we ask instead of guessing.
    expect(check({ inServiceState: "Uttar Pradesh", inServiceListed: null }).status).toBe("incomplete");
  });

  it("PMHS weightage note applies to MD/MS/Diploma only, not MDS", () => {
    const ids = (p: Partial<Profile>) => check(p).reasons.filter((r) => r.match === "applies").map((r) => r.rule.id);
    expect(ids({ inServiceState: "Uttar Pradesh", inServiceListed: true })).toContain("elig-pmhs-weightage");
    expect(ids({ inServiceState: "Uttar Pradesh", inServiceListed: true, courseType: "dental", internshipCompletion: "2026-03-31" })).not.toContain("elig-pmhs-weightage");
  });

  it("reserved category from another state is treated as UR", () => {
    expect(check({ domicileState: "Bihar", category: "OBC" }).effectiveCategory).toBe("UR");
    expect(check({ category: "OBC" }).effectiveCategory).toBe("OBC");
  });

  it("missing key facts gives an incomplete verdict instead of guessing", () => {
    const v = check({ mbbsState: null, internshipCompletion: null });
    expect(v.status).toBe("incomplete");
    expect(v.missingInfo).toContain("where you did MBBS/BDS");
    expect(v.missingInfo).toContain("your internship completion date");
  });

  it("a definite ineligibility wins over missing facts", () => {
    expect(check({ currentlyInPG: true, mbbsState: null }).status).toBe("ineligible");
  });
});

describe("UP 2026 security deposit", () => {
  const deposit = (p: Partial<Profile>) => adviseDeposit(check(p), up);

  it("UP MD/MS candidate needs ₹2L for govt + private, ₹30k for govt only", () => {
    const d = deposit({});
    expect(d.recommended?.amountInr).toBe(200000);
    expect(d.alternatives.map((a) => [a.tier.amountInr, a.covers])).toEqual([[30000, ["government"]]]);
  });

  it("private-only MD/MS candidate needs ₹2L", () => {
    expect(deposit({ mbbsState: "Delhi" }).recommended?.amountInr).toBe(200000);
    expect(deposit({ mbbsState: "Delhi" }).alternatives).toEqual([]);
  });

  it("MDS candidate needs ₹1L", () => {
    expect(deposit({ courseType: "dental" }).recommended?.amountInr).toBe(100000);
  });

  it("ineligible candidate gets no deposit advice", () => {
    expect(deposit({ currentlyInPG: true }).recommended).toBeNull();
  });
});

describe("UP 2026 documents", () => {
  it("adds category and PwD documents only when relevant", () => {
    const ids = (p: Partial<Profile>) => documentsFor({ ...base, ...p }, up).map((d) => d.doc.id);
    expect(ids({})).not.toContain("doc-reservation");
    expect(ids({ category: "EWS" })).toEqual(expect.arrayContaining(["doc-reservation", "doc-ews-format"]));
    // Other-state reserved candidates are treated as UR, so no UP category certificate is asked for.
    expect(ids({ category: "OBC", domicileState: "Bihar" })).not.toContain("doc-reservation");
    expect(ids({ pwd: true })).toContain("doc-pwd");
    expect(ids({ mbbsState: ABROAD })).toContain("doc-fmg");
  });
});
