import { describe, expect, it } from "vitest";
import tnRaw from "../../data/states/tamil-nadu-2026.json";
import klRaw from "../../data/states/kerala-2026.json";
import { BrochureSchema, type SourcedItem } from "../schema/stateBrochure";
import { adviseDeposit, checkEligibility, documentsFor } from "./eligibility";
import { EMPTY_PROFILE, type Profile } from "./profile";
import { seatOrder } from "../app/seats";

const tn = BrochureSchema.parse(tnRaw);
const kerala = BrochureSchema.parse(klRaw);
const base: Profile = {
  ...EMPTY_PROFILE, courseType: "clinical", mbbsState: "Tamil Nadu", domicileState: "Tamil Nadu",
  birthState: "Tamil Nadu", schoolState: "Tamil Nadu", nationality: "indian", category: "UR",
  pwd: false, nriLink: "none", inServiceState: "none", inServiceListed: false,
  priorAdmissionState: "none", currentlyInPG: false, internshipCompletion: "2026-09-30",
};

describe("new 2026 prospectuses preserve their exact eligibility routes", () => {
  it("does not replace Tamil Nadu nativity or a DNB service route with the generic profile", () => {
    expect(checkEligibility(base, tn).status).toBe("incomplete");
    expect(checkEligibility({ ...base, mbbsState: "Delhi", domicileState: "Delhi" }, tn).status).toBe("incomplete");
    expect(checkEligibility(base, tn).excludedCourses).toEqual([]);
  });

  it("Tamil Nadu's known internship deadline is a hard exclusion across the supplied medical routes", () => {
    expect(checkEligibility({ ...base, internshipCompletion: "2026-10-01" }, tn).status).toBe("ineligible");
    expect(checkEligibility(base, tn).status).toBe("incomplete");
  });

  it("does not infer Kerala origin from domicile, birthplace or MBBS alone", () => {
    for (const overrides of [{ domicileState: "Kerala" }, { birthState: "Kerala" }, { mbbsState: "Kerala" }]) {
      expect(checkEligibility({ ...base, ...overrides }, kerala).status).toBe("incomplete");
    }
  });

  it.each([tn, kerala])("medical prospectuses cannot declare MDS eligibility", (brochure) => {
    expect(checkEligibility({ ...base, courseType: "dental", internshipCompletion: "2026-10-01" }, brochure).status).toBe("notCovered");
  });

  it.each([tn, kerala])("does not recommend a sector-only deposit for route-specific charges", (brochure) => {
    expect(adviseDeposit(checkEligibility(base, brochure), brochure).recommended).toBeNull();
  });

  it("an OCI Kerala candidate is counted as UR and is not asked for reservation certificates", () => {
    const profile = { ...base, mbbsState: "Kerala", nationality: "oci" as const, category: "SC" as const, pwd: true };
    expect(checkEligibility(profile, kerala).effectiveCategory).toBe("UR");
    const ids = documentsFor(profile, kerala).map(({ doc }) => doc.id);
    expect(ids).not.toContain("doc-community-scst");
    expect(ids).not.toContain("doc-pwd-online-entry");
    expect(ids).not.toContain("doc-ews-certificate");
  });

  it("Tamil Nadu minority, prior-Diploma and NRI sponsor documents remain conditional", () => {
    const docs = documentsFor(base, tn);
    for (const id of ["mq-doc-minority-certificate", "mq-doc-diploma-certificate", "mq-doc-nri-guardian-court-order"]) {
      expect(docs.find(({ doc }) => doc.id === id)?.certain).toBe(false);
    }
  });

  it("mandatory undertakings stay required while government-employment and bond-group checks remain manual", () => {
    const docs = documentsFor(base, tn);
    expect(docs.find(({ doc }) => doc.id === "mq-doc-anti-ragging-declarations")?.certain).toBe(true);
    expect(docs.find(({ doc }) => doc.id === "mq-doc-behaviour-certificate")?.certain).toBe(true);
    expect(docs.find(({ doc }) => doc.id === "gq-doc-service-proforma")?.certain).toBe(false);
    expect(docs.find(({ doc }) => doc.id === "gq-doc-nonservice-bond-sureties")?.certain).toBe(false);
  });

  it("the Management & NRI view hides every government-programme item, including DNB", () => {
    const sections = [tn.process, tn.eligibility.rules, tn.reservation.rules, tn.fees.rules,
      tn.choiceFilling, tn.rounds, tn.documents, tn.admission, tn.resignation.rules,
      tn.resignation.ladder, tn.serviceBond.rules, tn.disabilityCentres, tn.annexures, tn.importantDates, tn.gaps];
    for (const items of sections) {
      expect(seatOrder<SourcedItem>("mgmtNri", items).some((item) => /^(gq|dnb)-/.test(item.id))).toBe(false);
      expect(seatOrder<SourcedItem>("government", items).some((item) => item.id.startsWith("mq-"))).toBe(false);
    }
  });
});
