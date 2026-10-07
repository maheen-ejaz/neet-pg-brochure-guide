import type {
  Brochure,
  Category,
  CollegeType,
  Condition,
  EligibilityRule,
  Sector,
} from "../schema/stateBrochure";
import { ABROAD, PROFILE_FIELD_LABELS, type Profile } from "./profile";

/** Three-valued result: null means the profile doesn't say enough to decide. */
type Tri = boolean | null;

export interface Facts {
  courseType: Profile["courseType"];
  mbbsLocation: "home" | "home_listed" | "other_state" | "abroad" | null;
  category: Category | null;
  isDomicile: boolean | null;
  pwd: boolean | null;
  inService: boolean | null;
  currentlyInPG: boolean | null;
  nationality: Profile["nationality"];
  internshipCompletion: string | null;
  schooledInState: boolean | null;
  studied10YearsInState: boolean | null;
  bornInState: boolean | null;
  isNri: boolean | null;
  priorAdmissionInState: boolean | null;
}

export function deriveFacts(profile: Profile, brochure: Brochure): Facts {
  const state = brochure.meta.state;
  let mbbsLocation: Facts["mbbsLocation"] = null;
  if (profile.mbbsState === ABROAD) mbbsLocation = "abroad";
  else if (profile.mbbsState === state) {
    const listed = brochure.eligibility.listedHomeInstitutions.names;
    mbbsLocation = profile.mbbsInstitution && listed.includes(profile.mbbsInstitution) ? "home_listed" : "home";
  } else if (profile.mbbsState) mbbsLocation = "other_state";

  return {
    courseType: profile.courseType,
    mbbsLocation,
    category: profile.category,
    isDomicile: profile.domicileState ? profile.domicileState === state : null,
    pwd: profile.pwd,
    // In service = employed by this state's health service AND meeting its in-service criteria.
    // Not employed here is a definite "no"; employed here but criteria unanswered is unknown.
    inService:
      profile.inServiceState === null
        ? null
        : profile.inServiceState !== state
          ? false
          : profile.inServiceListed,
    currentlyInPG: profile.currentlyInPG,
    nationality: profile.nationality,
    internshipCompletion: profile.internshipCompletion,
    schooledInState: profile.schoolState ? profile.schoolState === state : null,
    studied10YearsInState: profile.tenYearStudyState ? profile.tenYearStudyState === state : null,
    bornInState: profile.birthState ? profile.birthState === state : null,
    isNri: profile.nri,
    priorAdmissionInState: profile.priorAdmissionState === null ? null : profile.priorAdmissionState === state,
  };
}

export interface Evaluation {
  value: Tri;
  /** Facts that were needed but missing. */
  missing: string[];
}

export function evaluate(cond: Condition, facts: Facts): Evaluation {
  if ("all" in cond) {
    const parts = cond.all.map((c) => evaluate(c, facts));
    const missing = parts.flatMap((p) => p.missing);
    if (parts.some((p) => p.value === false)) return { value: false, missing: [] };
    return { value: parts.every((p) => p.value === true) ? true : null, missing };
  }
  if ("any" in cond) {
    const parts = cond.any.map((c) => evaluate(c, facts));
    if (parts.some((p) => p.value === true)) return { value: true, missing: [] };
    const missing = parts.flatMap((p) => p.missing);
    return { value: parts.every((p) => p.value === false) ? false : null, missing };
  }
  if ("not" in cond) {
    const inner = evaluate(cond.not, facts);
    return { value: inner.value === null ? null : !inner.value, missing: inner.missing };
  }
  if ("after" in cond || "onOrBefore" in cond) {
    const date = facts.internshipCompletion;
    if (!date) return { value: null, missing: ["internshipCompletion"] };
    // ISO dates compare correctly as strings.
    return { value: "after" in cond ? date > cond.after : date <= cond.onOrBefore, missing: [] };
  }
  const v = facts[cond.fact];
  if (v === null || v === undefined) return { value: null, missing: [cond.fact] };
  return { value: cond.in.includes(v), missing: [] };
}

export interface Reason {
  rule: EligibilityRule;
  /** "applies" = matched the profile; "maybe" = couldn't be decided; "manual" = no automatic check. */
  match: "applies" | "maybe" | "manual";
  missing: string[];
}

export interface Verdict {
  status: "eligible" | "restricted" | "ineligible" | "incomplete" | "notCovered";
  headline: string;
  sectors: Sector[];
  /** Seat quotas the candidate is limited to, or null when no quota restriction applies. */
  quotas: string[] | null;
  excludedCourses: string[];
  effectiveCategory: Category | null;
  reasons: Reason[];
  missingInfo: string[];
  collegeType: CollegeType | null;
}

export function checkEligibility(profile: Profile, brochure: Brochure): Verdict {
  const facts = deriveFacts(profile, brochure);
  let sectors: Sector[] = ["government", "private"];
  const excludedCourses = new Set<string>();
  let effectiveCategory = facts.category;
  let ineligible = false;
  let notCovered = false;
  let quotas: string[] | null = null;
  let blockingUnknown = false;
  const reasons: Reason[] = [];
  const missing = new Set<string>();

  for (const rule of brochure.eligibility.rules) {
    if (rule.condition === null) {
      reasons.push({ rule, match: "manual", missing: [] });
      continue;
    }
    const { value, missing: m } = evaluate(rule.condition, facts);
    if (value === false) continue;
    if (value === null) {
      m.forEach((f) => missing.add(f));
      reasons.push({ rule, match: "maybe", missing: m });
      // Only rules that would shrink eligibility make the verdict incomplete.
      if (rule.effect.type !== "note" && rule.effect.type !== "treatAsCategory") blockingUnknown = true;
      continue;
    }
    reasons.push({ rule, match: "applies", missing: [] });
    switch (rule.effect.type) {
      case "ineligible":
        ineligible = true;
        break;
      case "restrictSectors": {
        const allowed = rule.effect.sectors;
        sectors = sectors.filter((s) => allowed.includes(s));
        break;
      }
      case "excludeCourses":
        rule.effect.courses.forEach((c) => excludedCourses.add(c));
        break;
      case "restrictQuotas": {
        const allowed = rule.effect.quotas;
        quotas = quotas ? quotas.filter((q) => allowed.includes(q)) : [...allowed];
        break;
      }
      case "notCovered":
        notCovered = true;
        break;
      case "treatAsCategory":
        effectiveCategory = rule.effect.category;
        break;
      case "note":
        break;
    }
  }

  // Facts the verdict depends on even without a matching rule.
  if (!facts.courseType) missing.add("courseType");
  if (!facts.mbbsLocation) missing.add("mbbsLocation");

  let status: Verdict["status"];
  let headline: string;
  if (ineligible) {
    status = "ineligible";
    headline = "Not eligible for this counselling";
  } else if (notCovered) {
    status = "notCovered";
    headline = "This year's documents don't cover your course yet";
  } else if (sectors.length === 0 || quotas?.length === 0) {
    status = "ineligible";
    headline = "No college sector is open to you";
  } else if (blockingUnknown || !facts.courseType || !facts.mbbsLocation) {
    status = "incomplete";
    headline = "Add a few details to see your verdict";
  } else if (quotas) {
    status = "restricted";
    headline = `Eligible for ${quotas.join(" / ")} quota seats only`;
  } else if (sectors.length === 1) {
    status = "restricted";
    headline = sectors[0] === "private" ? "Eligible for private colleges only" : "Eligible for government colleges only";
  } else {
    status = "eligible";
    headline = "Eligible for government and private colleges";
  }

  return {
    status,
    headline,
    sectors: status === "ineligible" || status === "notCovered" ? [] : sectors,
    quotas: status === "ineligible" || status === "notCovered" ? null : quotas,
    excludedCourses: [...excludedCourses],
    effectiveCategory,
    reasons,
    missingInfo: [...missing].map((f) => PROFILE_FIELD_LABELS[f] ?? f),
    collegeType: facts.courseType === "dental" ? "dental" : facts.courseType === "clinical" ? "medical" : null,
  };
}

export interface DepositAdvice {
  recommended: Brochure["fees"]["securityDeposits"][number] | null;
  /** Cheaper tiers that cover only part of what's open to the candidate. */
  alternatives: { tier: Brochure["fees"]["securityDeposits"][number]; covers: Sector[] }[];
}

/** Cheapest deposit tier that unlocks every sector open to the candidate, for their college type. */
export function adviseDeposit(verdict: Verdict, brochure: Brochure): DepositAdvice {
  const type = verdict.collegeType;
  if (!type || verdict.sectors.length === 0) return { recommended: null, alternatives: [] };
  const tiers = [...brochure.fees.securityDeposits].sort((a, b) => a.amountInr - b.amountInr);
  const coverage = (t: (typeof tiers)[number]) =>
    verdict.sectors.filter((s) => t.allows.some((a) => a.sector === s && a.collegeType === type));
  const recommended = tiers.find((t) => coverage(t).length === verdict.sectors.length) ?? null;
  const alternatives = tiers
    .filter((t) => t !== recommended && coverage(t).length > 0 && t.amountInr < (recommended?.amountInr ?? Infinity))
    .map((tier) => ({ tier, covers: coverage(tier) }));
  return { recommended, alternatives };
}

/** Documents relevant to this profile; conditional ones with unknown facts are included and flagged. */
export function documentsFor(profile: Profile, brochure: Brochure) {
  const facts = deriveFacts(profile, brochure);
  return brochure.documents
    .map((doc) => {
      if (doc.appliesWhen === null) return { doc, certain: true };
      const { value } = evaluate(doc.appliesWhen, facts);
      return value === false ? null : { doc, certain: value === true };
    })
    .filter((d): d is { doc: Brochure["documents"][number]; certain: boolean } => d !== null);
}
