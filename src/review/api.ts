import { BrochureSchema, type Brochure } from "../schema/stateBrochure";

export async function listFiles(): Promise<string[]> {
  const r = await fetch("/__review/states");
  if (!r.ok) throw new Error(`list failed: ${r.status}`);
  return r.json();
}

export async function loadFile(file: string): Promise<Brochure> {
  const r = await fetch(`/__review/states/${file}`);
  if (!r.ok) throw new Error(`load failed: ${r.status}`);
  // Normalise through the schema so defaults (e.g. source.documents, helpCentres) exist
  // for files written before those fields were added.
  return BrochureSchema.parse(await r.json());
}

export async function saveFile(file: string, doc: Brochure): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await fetch(`/__review/states/${file}`, {
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

/** pdftoppm zero-pads page numbers to the digit count of the last page (p-01 … p-25). */
export function pageUrl(file: string, page: number, pageCount: number) {
  const width = String(pageCount).length;
  return `/__review/pages/${file}/p-${String(page).padStart(width, "0")}.jpg`;
}
