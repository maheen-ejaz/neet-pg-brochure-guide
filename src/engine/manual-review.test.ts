import { describe, expect, it } from "vitest";
import raw from "../../data/states/uttar-pradesh-2026.json";
import { BrochureSchema } from "../schema/stateBrochure";
import { adviseDeposit, checkEligibility, documentsFor } from "./eligibility";
import { EMPTY_PROFILE, type Profile } from "./profile";

const profile: Profile = {
  ...EMPTY_PROFILE,
  courseType: "clinical",
  mbbsState: "Uttar Pradesh",
  domicileState: "Uttar Pradesh",
  nationality: "indian",
  category: "UR",
  inServiceState: "none",
  currentlyInPG: false,
  internshipCompletion: "2026-09-30",
};

const manual = {
  id: "manual-requirements", sourcePages: [4], verified: false,
  title: "Check the exact requirements", detail: "The collected profile does not establish every route.",
};

describe("brochure requirements outside the collected profile", () => {
  it("does not declare eligibility when a brochure requires a manual route check", () => {
    const brochure = BrochureSchema.parse({ ...raw, eligibility: { ...raw.eligibility, manualReview: manual } });
    const verdict = checkEligibility(profile, brochure);
    expect(verdict.status).toBe("incomplete");
    expect(verdict.headline).toContain("brochure requirements");
  });

  it("a definite exclusion or an uncovered course still wins over the manual check", () => {
    const brochure = BrochureSchema.parse({ ...raw, eligibility: { ...raw.eligibility, manualReview: manual } });
    expect(checkEligibility({ ...profile, currentlyInPG: true }, brochure).status).toBe("ineligible");
    brochure.eligibility.rules.push({
      id: "uncovered", sourcePages: [4], verified: false, title: "Course not covered", explanation: "Medical only.",
      condition: { fact: "courseType", in: ["dental"] }, effect: { type: "notCovered" },
    });
    expect(checkEligibility({ ...profile, currentlyInPG: true, courseType: "dental" }, brochure).status).toBe("notCovered");
  });

  it("does not choose a deposit using sector alone when the fee depends on an uncollected route", () => {
    const brochure = BrochureSchema.parse({ ...raw, fees: { ...raw.fees, calculationNote: manual } });
    expect(adviseDeposit(checkEligibility(profile, brochure), brochure)).toEqual({ recommended: null, alternatives: [] });
  });

  it("keeps an unmodellable conditional document visible and labels it if applicable", () => {
    const brochure = BrochureSchema.parse(raw);
    brochure.documents.push({
      id: "conditional-document", sourcePages: [4], verified: false,
      name: "Certificate for a specific route", stage: "registration", appliesWhen: null, requiresManualCheck: true,
    });
    expect(documentsFor(profile, brochure).find(({ doc }) => doc.id === "conditional-document")?.certain).toBe(false);
  });
});
