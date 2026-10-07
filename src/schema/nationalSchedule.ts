import { z } from "zod";
import { ROUND_IDS, STAGE_KEYS } from "./schedule-keys.ts";
import { isoDate, sourced } from "./stateBrochure.ts";

/**
 * A national counselling schedule (e.g. MCC's All India Quota timetable), one file per document
 * in data/national. Same sourced-item contract as state brochures, so review and publishing work
 * the same way. Dates are ISO here and shown as DD-MM-YYYY.
 */
const Stage = z.object({
  key: z.enum(STAGE_KEYS),
  label: z.string(),
  start: isoDate,
  end: isoDate.optional(),
  /** Clock times as printed, e.g. "4:00 PM" / "12:00 noon" (server time). */
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const ScheduleSchema = z.object({
  meta: z.object({
    ...sourced,
    title: z.string(),
    shortTitle: z.string(),
    authority: z.string(),
    /** What the schedule covers, as stated (e.g. "50% All India Quota seats"). */
    scope: z.array(z.string()),
    /** Courses it covers; used to warn candidates on other courses (e.g. MDS). */
    courses: z.array(z.enum(["clinical", "dental"])).min(1),
    tentative: z.boolean(),
    /** Date printed on the document (e.g. eOffice generation date). */
    documentDate: isoDate,
    documentDateLabel: z.string(),
    reference: z.string().optional(),
    officialWebsites: z.array(z.string().url()),
  }),
  status: z.enum(["draft", "published"]),
  source: z.object({
    dir: z.string(),
    pageCount: z.number().int().positive(),
    scanned: z.boolean(),
    languages: z.array(z.string()),
    documents: z
      .array(z.object({ title: z.string(), url: z.string().url().optional(), issued: z.string().optional(), startPage: z.number().int().positive(), pageCount: z.number().int().positive() }))
      .default([]),
  }),
  rounds: z.array(z.object({ ...sourced, round: z.enum(ROUND_IDS), name: z.string(), stages: z.array(Stage).min(1) })),
  milestones: z.array(z.object({ ...sourced, label: z.string(), date: isoDate })),
  notes: z.array(z.object({ ...sourced, title: z.string(), detail: z.string() })),
  gaps: z.array(z.object({ ...sourced, title: z.string(), detail: z.string() })),
});

export type Schedule = z.infer<typeof ScheduleSchema>;
export type ScheduleRound = Schedule["rounds"][number];
export type ScheduleStage = ScheduleRound["stages"][number];
