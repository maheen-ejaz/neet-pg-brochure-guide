import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ScheduleSchema, type Schedule } from "../src/schema/nationalSchedule.ts";
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

    // Merged-source documents must tile the merged PDF exactly, in order.
    let next = 1;
    for (const d of doc.source.documents) {
      if (d.startPage !== next) errors.push(`source.documents "${d.title}" starts at ${d.startPage}, expected ${next}`);
      next = d.startPage + d.pageCount;
    }
    if (doc.source.documents.length > 0 && next - 1 !== doc.source.pageCount) {
      errors.push(`source.documents cover ${next - 1} pages but pageCount is ${doc.source.pageCount}`);
    }

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

// National schedules (data/national/*.json, e.g. MCC): schema, citations and the same publish gate.
const nationalDir = path.join(process.cwd(), "data", "national");
const nationalFiles = (await readdir(nationalDir).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort();
for (const file of nationalFiles) {
  const errors: string[] = [];
  const parsed = ScheduleSchema.safeParse(JSON.parse(await readFile(path.join(nationalDir, file), "utf8")));
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.push(`${issue.path.join(".")}: ${issue.message}`);
  } else {
    const doc = parsed.data;
    if (!/^[a-z0-9-]+-\d{4}\.json$/.test(file)) errors.push("file should be named <name>-<year>.json");
    const items = collectSourcedItems(doc);
    const seen = new Set<string>();
    for (const { path: p, item } of items) {
      if (seen.has(item.id)) errors.push(`duplicate id "${item.id}"`);
      seen.add(item.id);
      for (const page of item.sourcePages) {
        if (page > doc.source.pageCount) errors.push(`${p.join(".")} (${item.id}) cites page ${page} > ${doc.source.pageCount}`);
      }
      if (item.sourcePages.length === 0 && !p.includes("gaps")) errors.push(`${p.join(".")} (${item.id}) has no source page`);
    }
    for (const r of doc.rounds) {
      for (const st of r.stages) {
        if (st.end && st.end < st.start) errors.push(`${r.id}.${st.key}: end ${st.end} is before start ${st.start}`);
      }
    }
    const unverified = items.filter((i) => !i.item.verified);
    if (doc.status === "published" && unverified.length > 0) {
      errors.push(`published but ${unverified.length} item(s) unverified: ${unverified.slice(0, 5).map((i) => i.item.id).join(", ")}…`);
    }
    if (errors.length === 0) console.log(`✓ national/${file} (${doc.status}, ${items.length - unverified.length}/${items.length} verified)`);
  }
  if (errors.length > 0) {
    failed = true;
    console.error(`✗ national/${file}`);
    for (const e of errors) console.error(`   ${e}`);
  }
}

// State rules that link to a national schedule must point at a real round and stage.
const schedules = new Map<string, Schedule>();
for (const file of nationalFiles) {
  const r = ScheduleSchema.safeParse(JSON.parse(await readFile(path.join(nationalDir, file), "utf8")));
  if (r.success) schedules.set(file.replace(/\.json$/, ""), r.data);
}
for (const file of files) {
  const r = BrochureSchema.safeParse(JSON.parse(await readFile(path.join(dir, file), "utf8")));
  if (!r.success) continue;
  for (const { item } of collectSourcedItems(r.data)) {
    for (const ref of (item as { schedule?: { key: string; round: string; stages: string[] }[] }).schedule ?? []) {
      const sched = schedules.get(ref.key);
      const round = sched?.rounds.find((x) => x.round === ref.round);
      const missing = ref.stages.filter((k) => !round?.stages.some((s) => s.key === k));
      if (!sched || !round || missing.length) {
        failed = true;
        console.error(`✗ ${file}: ${item.id} links to ${ref.key} ${ref.round} ${missing.join(", ") || ""}, which doesn't exist`);
      }
    }
  }
}

process.exit(failed ? 1 : 0);
