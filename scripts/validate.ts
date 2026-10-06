import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { BrochureSchema, collectSourcedItems } from "../src/schema/stateBrochure.ts";

/**
 * Checks every data/states/*.json file:
 *  - matches the schema, has unique item ids, and cites pages that exist;
 *  - file name matches <stateSlug>-<year>;
 *  - if status is "published", every sourced item is verified (the publish gate).
 * Drafts are allowed and simply excluded from the production build.
 */
const dir = path.join(process.cwd(), "data", "states");
const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
let failed = false;

for (const file of files) {
  const errors: string[] = [];
  const parsed = BrochureSchema.safeParse(JSON.parse(await readFile(path.join(dir, file), "utf8")));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join(".")}: ${issue.message}`);
  } else {
    const doc = parsed.data;
    const expected = `${doc.meta.stateSlug}-${doc.meta.year}.json`;
    if (file !== expected) errors.push(`file should be named ${expected}`);

    const items = collectSourcedItems(doc);
    const seen = new Set<string>();
    for (const { path: p, item } of items) {
      if (seen.has(item.id)) errors.push(`duplicate id "${item.id}"`);
      seen.add(item.id);
      for (const page of item.sourcePages) {
        if (page > doc.source.pageCount) errors.push(`${p.join(".")} (${item.id}) cites page ${page} > ${doc.source.pageCount}`);
      }
      if (item.sourcePages.length === 0 && !p.includes("gaps")) {
        errors.push(`${p.join(".")} (${item.id}) has no source page`);
      }
    }
    const unverified = items.filter((i) => !i.item.verified);
    if (doc.status === "published" && unverified.length > 0) {
      errors.push(`published but ${unverified.length} item(s) unverified: ${unverified.slice(0, 5).map((i) => i.item.id).join(", ")}…`);
    }
    const summary = `${doc.status}, ${items.length - unverified.length}/${items.length} verified`;
    if (errors.length === 0) console.log(`✓ ${file} (${summary})`);
  }
  if (errors.length > 0) {
    failed = true;
    console.error(`✗ ${file}`);
    for (const e of errors) console.error(`   ${e}`);
  }
}

if (files.length === 0) console.log("No state files in data/states.");
process.exit(failed ? 1 : 0);
