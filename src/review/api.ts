import { ScheduleSchema, type Schedule } from "../schema/nationalSchedule";
import { BrochureSchema, type Brochure } from "../schema/stateBrochure";

/** data/states (state brochures) or data/national (national schedules such as MCC's). */
export type Kind = "states" | "national";
export type ReviewDoc = Brochure | Schedule;

export async function listFiles(kind: Kind = "states"): Promise<string[]> {
  const r = await fetch(`/__review/${kind}`);
  if (!r.ok) throw new Error(`list failed: ${r.status}`);
  return r.json();
}

export async function loadFile(file: string, kind: Kind = "states"): Promise<ReviewDoc> {
  const r = await fetch(`/__review/${kind}/${file}`);
  if (!r.ok) throw new Error(`load failed: ${r.status}`);
  // Normalise through the schema so defaults (e.g. source.documents, helpCentres) exist
  // for files written before those fields were added.
  const raw = await r.json();
  return kind === "states" ? BrochureSchema.parse(raw) : ScheduleSchema.parse(raw);
}

export async function saveFile(file: string, doc: ReviewDoc, kind: Kind = "states"): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch(`/__review/${kind}/${file}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(doc),
  });
  if (r.ok) return { ok: true };
  const body = await r.json().catch(() => ({}));
  const issues = (body.issues ?? []) as { path: (string | number)[]; message: string }[];
  return {
    ok: false,
    error: issues.length ? issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n") : body.error ?? `HTTP ${r.status}`,
  };
}

/** Display name of a review file: "Karnataka 2026" or the schedule's short title. */
export const docTitle = (doc: ReviewDoc) => ("state" in doc.meta ? `${doc.meta.state} ${doc.meta.year}` : doc.meta.shortTitle);

/** pdftoppm zero-pads page numbers to the digit count of the last page (p-01 … p-25). */
export function pageUrl(file: string, page: number, pageCount: number) {
  const width = String(pageCount).length;
  return `/__review/pages/${file}/p-${String(page).padStart(width, "0")}.jpg`;
}
