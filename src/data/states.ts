import entries from "virtual:brochures";
import { BrochureSchema, type Brochure } from "../schema/stateBrochure";

export interface StateEntry {
  /** <stateSlug>-<year>, also the data file name and route key. */
  key: string;
  brochure: Brochure;
}

/**
 * The dev server includes drafts (clearly labelled) so the student view can be
 * previewed during review; a production build only contains published states
 * (filtered at build time by brochuresPlugin).
 */
export const states: StateEntry[] = entries
  .map(({ key, raw }) => ({ key, brochure: BrochureSchema.parse(raw) }))
  .sort((a, b) => a.brochure.meta.state.localeCompare(b.brochure.meta.state) || b.brochure.meta.year - a.brochure.meta.year);

export const findState = (key: string | undefined) => states.find((s) => s.key === key);

/** Comparison needs two or more published states. */
export const comparisonEnabled = states.filter((s) => s.brochure.status === "published").length >= 2;
