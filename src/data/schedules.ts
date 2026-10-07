import entries from "virtual:schedules";
import { ScheduleSchema, type Schedule } from "../schema/nationalSchedule";

export interface ScheduleEntry {
  /** File name in data/national, also the route key. */
  key: string;
  schedule: Schedule;
}

/** National schedules: all on the dev server, published only in builds (see brochuresPlugin). */
export const schedules: ScheduleEntry[] = entries.map(({ key, raw }) => ({ key, schedule: ScheduleSchema.parse(raw) }));

export const findSchedule = (key: string | undefined) => schedules.find((s) => s.key === key);
