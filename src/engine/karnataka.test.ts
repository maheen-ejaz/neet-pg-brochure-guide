import { describe, expect, it } from "vitest";
import raw from "../../data/states/karnataka-2026.json";
import { BrochureSchema } from "../schema/stateBrochure";
import { checkEligibility, documentsFor } from "./eligibility";
import { ABROAD, NONE, NOT_IN_SERVICE, type Profile } from "./profile";

const ka = BrochureSchema.parse(raw);

const base: Profile = {
  air: 5000,
  courseType: "dental",
  mbbsState: "Karnataka",
  mbbsInstitution: null,
  domicileState: "Karnataka",
  schoolState: "Karnataka",
  tenYearStudyState: "Karnataka",
  birthState: "Karnataka",
  nri: false,
  category: "UR",
  pwd: false,
  inServiceState: NOT_IN_SERVICE,
  inServiceListed: null,
  priorAdmissionState: NONE,
  internshipCompletion: "2026-03-31",
  currentlyInPG: false,
  nationality: "indian",
  specialities: [],
};
const check = (p: Partial<Profile>) => checkEligibility({ ...base, ...p }, ka);
const ids = (p: Partial<Profile>) => check(p).reasons.filter((r) => r.match === "applies").map((r) => r.rule.id);

describe("Karnataka 2026 eligibility", () => {
  it("clause b (Karnataka BDS, 10 years of school in Karnataka) is fully eligible", () => {
    const v = check({});
    expect(v.status).toBe("eligible");
    expect(v.quotas).toBeNull();
    expect(ids({})).toContain("elig-clause-b");
  });

  it("clause c (BDS outside Karnataka, 10 years of school in Karnataka) is fully eligible", () => {
    expect(check({ mbbsState: "Kerala" }).status).toBe("eligible");
    expect(ids({ mbbsState: "Kerala" })).toContain("elig-clause-c");
  });

  it("clause a (Karnataka BDS without 10 years of school there) loses GMP", () => {
    expect(check({ tenYearStudyState: "Kerala" }).quotas).toEqual(["Government", "OPN", "NRI", "Others (Q)"]);
  });

  it("clause y (outside Karnataka, no 10 years) gets OPN, NRI and Others (Q)", () => {
    expect(check({ mbbsState: "Kerala", tenYearStudyState: NONE }).quotas).toEqual(["OPN", "NRI", "Others (Q)"]);
  });

  it("non-NRIs are warned that NRI seats need an NRI sponsor, not excluded", () => {
    expect(ids({ mbbsState: "Kerala", tenYearStudyState: NONE })).toContain("elig-not-nri");
    expect(ids({ mbbsState: "Kerala", tenYearStudyState: NONE, nri: true })).not.toContain("elig-not-nri");
  });

  it("foreign graduates appear limited to OPN and NRI, with or without Karnataka schooling", () => {
    expect(check({ mbbsState: ABROAD }).quotas).toEqual(["OPN", "NRI"]);
    expect(check({ mbbsState: ABROAD, tenYearStudyState: NONE }).quotas).toEqual(["OPN", "NRI"]);
  });

  it("OCI and foreign nationals are limited to NRI seats", () => {
    expect(check({ nationality: "oci", nri: true }).quotas).toEqual(["NRI"]);
    expect(check({ nationality: "foreign", nri: true }).quotas).toEqual(["NRI"]);
  });

  it("unknown 10-year schooling leaves the verdict incomplete", () => {
    const v = check({ tenYearStudyState: null, mbbsState: "Kerala" });
    expect(v.status).toBe("incomplete");
    expect(v.missingInfo).toContain("where you studied 10 years of school (1st–12th standard)");
  });

  it("MDS internship after 31 May 2026 is ineligible; on the day is fine", () => {
    expect(check({ internshipCompletion: "2026-06-01" }).status).toBe("ineligible");
    expect(check({ internshipCompletion: "2026-05-31" }).status).not.toBe("ineligible");
  });

  it("MD/MS candidates see the MCC warning but no MDS internship cut-off", () => {
    const applied = ids({ courseType: "clinical", internshipCompletion: "2026-08-31" });
    expect(applied).toContain("elig-medical-pending");
    expect(applied).not.toContain("elig-internship-mds");
  });

  it("reserved candidates from outside Karnataka count as General", () => {
    expect(check({ category: "SC", domicileState: "Kerala" }).effectiveCategory).toBe("UR");
    expect(check({ category: "SC" }).effectiveCategory).toBe("SC");
  });

  it("Karnataka SC candidates are told about SCA/SCB/SCC certificates", () => {
    expect(ids({ category: "SC" })).toContain("elig-sc-internal");
    expect(ids({ category: "SC", domicileState: "Kerala" })).not.toContain("elig-sc-internal");
  });

  it("caste certificate isn't requested from candidates counted as General", () => {
    const docs = (p: Partial<Profile>) => documentsFor({ ...base, ...p }, ka).map((d) => d.doc.id);
    expect(docs({ category: "OBC" })).toContain("doc-caste");
    expect(docs({ category: "OBC", domicileState: "Kerala" })).not.toContain("doc-caste");
  });
});
