import { z } from "zod";
import { ROUND_IDS, STAGE_KEYS } from "./schedule-keys.ts";

/**
 * Canonical shape of one state's NEET PG counselling brochure (one file per state-year
 * in data/states). Every reviewable fact is a "sourced item": it carries a stable id,
 * the brochure pages it came from, and a verified flag set by a human reviewer.
 */

/** Seat types an item can be limited to. Most items apply to all and carry no tag. */
export const SEAT_TYPES = ["government", "management", "nri"] as const;
export const SeatType = z.enum(SEAT_TYPES);

export const sourced = {
  id: z.string().min(1),
  sourcePages: z.array(z.number().int().positive()),
  verified: z.boolean(),
  note: z.string().optional(),
  /** Only when the source limits this item to these seat types. Omitted = applies to every seat type. */
  seats: z.array(SeatType).min(1).optional(),
};

export const SECTORS = ["government", "private"] as const;
export const COLLEGE_TYPES = ["medical", "dental"] as const;
export const CATEGORIES = ["UR", "OBC", "SC", "ST", "EWS"] as const;
export const COURSE_TYPES = ["clinical", "dental"] as const;
export const MBBS_LOCATIONS = ["home", "home_listed", "other_state", "abroad"] as const;
export const NATIONALITIES = ["indian", "oci", "foreign"] as const;

export const Sector = z.enum(SECTORS);
export const CollegeType = z.enum(COLLEGE_TYPES);
export const Category = z.enum(CATEGORIES);

/** Facts the eligibility engine derives from a candidate profile relative to one state. */
export const FACTS = [
  "courseType",
  "mbbsLocation",
  "category",
  "isDomicile",
  "pwd",
  "inService",
  "currentlyInPG",
  "nationality",
  "schooledInState",
  "studied10YearsInState",
  "bornInState",
  "isNri",
  "nriLink",
  "parentServiceRoute",
  "priorAdmissionInState",
] as const;
export const Fact = z.enum(FACTS);

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: z.infer<typeof Fact>; in: (string | boolean)[] }
  | { fact: "internshipCompletion"; after: string }
  | { fact: "internshipCompletion"; onOrBefore: string };

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition).min(1) }).strict(),
    z.object({ any: z.array(Condition).min(1) }).strict(),
    z.object({ not: Condition }).strict(),
    z.object({ fact: Fact, in: z.array(z.union([z.string(), z.boolean()])).min(1) }).strict(),
    z.object({ fact: z.literal("internshipCompletion"), after: isoDate }).strict(),
    z.object({ fact: z.literal("internshipCompletion"), onOrBefore: isoDate }).strict(),
  ]),
);

export const Effect = z.discriminatedUnion("type", [
  /** Candidate cannot take part in this counselling. */
  z.object({ type: z.literal("ineligible") }),
  /** Candidate may only choose colleges in these sectors. */
  z.object({ type: z.literal("restrictSectors"), sectors: z.array(Sector).min(1) }),
  /** Candidate may not choose these course types (e.g. DNB state quota). */
  z.object({ type: z.literal("excludeCourses"), courses: z.array(z.string()).min(1) }),
  /** Candidate is counted under this category for this state. */
  z.object({ type: z.literal("treatAsCategory"), category: Category }),
  /** Candidate may only be considered under these seat quotas (e.g. NRI). */
  z.object({ type: z.literal("restrictQuotas"), quotas: z.array(z.string()).min(1) }),
  /** The documents don't cover this candidate's course (e.g. MDS not yet notified). */
  z.object({ type: z.literal("notCovered") }),
  /** Informational: shown to matching candidates. */
  z.object({ type: z.literal("note"), tone: z.enum(["positive", "info", "warning"]) }),
]);

export const EligibilityRule = z.object({
  ...sourced,
  title: z.string(),
  explanation: z.string(),
  /** null = cannot be evaluated automatically; always shown as a manual check. */
  condition: Condition.nullable(),
  effect: Effect,
});

/** Links a state rule to the national (MCC) schedule dates it depends on, e.g. AIQ Round 2 reporting. */
export const ScheduleRef = z.object({
  key: z.string(),
  round: z.enum(ROUND_IDS),
  stages: z.array(z.enum(STAGE_KEYS)).min(1),
});

export const RuleItem = z.object({
  ...sourced,
  title: z.string(),
  detail: z.string(),
  tag: z.string().optional(),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  schedule: z.array(ScheduleRef).min(1).optional(),
});

export const BrochureSchema = z.object({
  meta: z.object({
    ...sourced,
    state: z.string(),
    stateSlug: z.string().regex(/^[a-z0-9-]+$/),
    year: z.number().int(),
    title: z.string(),
    authority: z.string(),
    officialWebsites: z.array(z.string().url()),
    coursesCovered: z.array(z.string()),
    governmentOrders: z.array(z.string()),
    /** The state's own names for the three seat types (e.g. Gujarat: "Management quota (MQ)"). */
    seatTerms: z
      .object({ government: z.string(), management: z.string(), nri: z.string().nullable() })
      .optional(),
  }),
  status: z.enum(["draft", "published"]),
  source: z.object({
    /** Folder (relative to repo root) holding source.pdf and pages/p-NN.jpg (committed with the data). */
    dir: z.string(),
    pageCount: z.number().int().positive(),
    scanned: z.boolean(),
    languages: z.array(z.string()),
    /**
     * When the source is several official documents merged into source.pdf, each document's
     * page range in the merged file. Citations stay merged-file page numbers; the UI shows
     * them as "<document> p. N".
     */
    documents: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url().optional(),
          issued: z.string().optional(),
          startPage: z.number().int().positive(),
          pageCount: z.number().int().positive(),
        }),
      )
      .default([]),
  }),
  process: z.array(
    z.object({ ...sourced, title: z.string(), description: z.string(), link: z.string().url().optional() }),
  ),
  eligibility: z.object({
    /** Home-state institutions whose graduates are treated differently (mbbsLocation = home_listed). */
    listedHomeInstitutions: z.object({ ...sourced, label: z.string(), names: z.array(z.string()) }),
    inServiceLabel: z.object({ ...sourced, label: z.string() }),
    /** Plain meanings of the seat-quota codes used in verdicts (e.g. Karnataka "OPN"). */
    quotaTerms: z
      .object({ ...sourced, terms: z.array(z.object({ code: z.string(), meaning: z.string() })) })
      .optional(),
    rules: z.array(EligibilityRule),
  }),
  reservation: z.object({
    policy: z.object({
      ...sourced,
      appliesTo: z.string(),
      vertical: z.array(z.object({ category: z.string(), percent: z.number() })),
      horizontal: z.array(z.object({ category: z.string(), percent: z.number() })),
    }).nullable(),
    conversion: z.object({
      ...sourced,
      when: z.string(),
      steps: z.array(z.object({ from: z.string(), to: z.string() })),
    }).nullable(),
    rules: z.array(RuleItem),
  }),
  fees: z.object({
    registration: z.object({
      ...sourced,
      amountInr: z.number(),
      covers: z.string(),
      refundable: z.boolean(),
    }),
    securityDeposits: z.array(
      z.object({
        ...sourced,
        amountInr: z.number(),
        label: z.string(),
        allows: z.array(z.object({ sector: Sector, collegeType: CollegeType })).min(1),
      }),
    ),
    rules: z.array(RuleItem),
  }),
  choiceFilling: z.array(RuleItem),
  rounds: z.array(RuleItem),
  documents: z.array(
    z.object({
      ...sourced,
      name: z.string(),
      stage: z.enum(["registration", "admission", "other"]),
      appliesWhen: Condition.nullable(),
      detail: z.string().optional(),
    }),
  ),
  admission: z.array(RuleItem),
  resignation: z.object({
    rules: z.array(RuleItem),
    ladder: z.array(
      z.object({
        ...sourced,
        stage: z.string(),
        window: z.string(),
        sector: z.enum(["government", "private", "all"]),
        /** Omitted when the state has no security deposit (e.g. Karnataka charges penalties instead). */
        securityDeposit: z.enum(["refunded", "forfeited"]).optional(),
        fees: z.string(),
        otherConsequence: z.string().optional(),
      }),
    ),
  }),
  serviceBond: z.object({
    bond: z
      .object({
        ...sourced,
        appliesTo: z.string(),
        durationYears: z.number(),
        amounts: z.array(z.object({ course: z.string(), amountInr: z.number() })),
        placeOfService: z.string(),
      })
      .nullable(),
    rules: z.array(RuleItem),
  }),
  helpdesk: z.object({
    ...sourced,
    phones: z.array(z.object({ label: z.string(), numbers: z.array(z.string()) })),
    emails: z.array(z.object({ label: z.string(), addresses: z.array(z.string()) })),
    hours: z.string(),
    websites: z.array(z.string()),
    instructions: z.array(z.string()),
  }),
  helpCentres: z
    .array(z.object({ ...sourced, name: z.string(), address: z.string() }))
    .default([]),
  nodalCentres: z.array(
    z.object({
      ...sourced,
      centre: z.string(),
      privateMedical: z.array(z.string()),
      privateDental: z.array(z.string()),
    }),
  ),
  disabilityCentres: z.array(
    z.object({ ...sourced, name: z.string(), location: z.string(), remarks: z.string() }),
  ),
  annexures: z.array(z.object({ ...sourced, title: z.string(), description: z.string() })),
  importantDates: z.array(
    z.object({
      ...sourced,
      label: z.string(),
      date: isoDate,
      endDate: isoDate.optional(),
      /** Closing time on the last day, as printed (e.g. "4:00 PM"); drives the HH:MM countdown. */
      endTime: z.string().optional(),
      /** Small print under the label: appointments, opening hours, closures. */
      detail: z.string().optional(),
    }),
  ),
  gaps: z.array(z.object({ ...sourced, title: z.string(), detail: z.string() })),
});

export type Brochure = z.infer<typeof BrochureSchema>;
export type EligibilityRule = z.infer<typeof EligibilityRule>;
export type RuleItem = z.infer<typeof RuleItem>;
export type Effect = z.infer<typeof Effect>;
export type Sector = z.infer<typeof Sector>;
export type CollegeType = z.infer<typeof CollegeType>;
export type Category = z.infer<typeof Category>;
export type SeatType = z.infer<typeof SeatType>;
export type ScheduleRef = z.infer<typeof ScheduleRef>;

export interface SourcedItem {
  id: string;
  sourcePages: number[];
  verified: boolean;
  note?: string;
  seats?: SeatType[];
}

/** True for any object carrying the sourced-item contract. */
export function isSourcedItem(v: unknown): v is SourcedItem & Record<string, unknown> {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as SourcedItem).id === "string" &&
    Array.isArray((v as SourcedItem).sourcePages) &&
    typeof (v as SourcedItem).verified === "boolean"
  );
}

/** Every sourced item in a brochure with a human-readable path, in document order. */
export function collectSourcedItems(doc: unknown, path: string[] = []): { path: string[]; item: SourcedItem & Record<string, unknown> }[] {
  const out: { path: string[]; item: SourcedItem & Record<string, unknown> }[] = [];
  if (Array.isArray(doc)) {
    doc.forEach((v, i) => out.push(...collectSourcedItems(v, [...path, String(i)])));
  } else if (typeof doc === "object" && doc !== null) {
    if (isSourcedItem(doc)) out.push({ path, item: doc });
    for (const [k, v] of Object.entries(doc)) {
      if (typeof v === "object" && v !== null) out.push(...collectSourcedItems(v, [...path, k]));
    }
  }
  return out;
}

export type SourceDocument = Brochure["source"]["documents"][number];

/** Which merged-file document a page belongs to, and its page number within that document. */
export function locatePage(documents: SourceDocument[] | undefined, page: number) {
  const doc = (documents ?? []).find((d) => page >= d.startPage && page < d.startPage + d.pageCount);
  return doc ? { doc, localPage: page - doc.startPage + 1 } : null;
}
