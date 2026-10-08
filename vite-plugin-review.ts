import { readFileSync, readdirSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { ScheduleSchema } from "./src/schema/nationalSchedule.ts";
import { BrochureSchema } from "./src/schema/stateBrochure.ts";

/**
 * Local-only review API. Registered with `apply: "serve"`, so it never exists in a
 * production build. Lets the /review page read and save data/states/*.json (state brochures)
 * and data/national/*.json (national schedules, e.g. MCC), and view source page images from the
 * brochures/ folder.
 */
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "states");
const NATIONAL_DIR = path.join(ROOT, "data", "national");
const KINDS = {
  states: { dir: DATA_DIR, schema: BrochureSchema },
  national: { dir: NATIONAL_DIR, schema: ScheduleSchema },
} as const;
type Kind = keyof typeof KINDS;
const isKind = (k: string): k is Kind => k in KINDS;
const FILE_RE = /^[a-z0-9-]+-\d{4}$/;
const PAGE_RE = /^p-\d{1,4}\.jpg$/;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export function reviewPlugin(): Plugin {
  return {
    name: "brochure-review",
    apply: "serve",
    // Saving from the review page would otherwise hot-reload the editor mid-review.
    // The student preview picks up changes on a manual refresh.
    handleHotUpdate({ file, server }) {
      for (const [dir, id] of [[DATA_DIR, RESOLVED_STATES_ID], [NATIONAL_DIR, RESOLVED_SCHEDULES_ID]] as const) {
        if (file.startsWith(dir + path.sep)) {
          const mod = server.moduleGraph.getModuleById(id);
          if (mod) server.moduleGraph.invalidateModule(mod);
          return [];
        }
      }
    },
    configureServer(server) {
      server.middlewares.use("/__review", async (req, res, next) => {
        try {
          const url = new URL(req.url ?? "/", "http://local");
          const parts = url.pathname.split("/").filter(Boolean);

          // GET /__review/:kind  (kind = states | national)
          if (req.method === "GET" && parts.length === 1 && isKind(parts[0])) {
            const files = (await readdir(KINDS[parts[0]].dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json"));
            return send(res, 200, files.map((f) => f.replace(/\.json$/, "")));
          }

          // GET|PUT /__review/:kind/:file
          if (parts.length === 2 && isKind(parts[0])) {
            const { dir, schema } = KINDS[parts[0]];
            const file = parts[1];
            if (!FILE_RE.test(file)) return send(res, 400, { error: "bad file name" });
            const filePath = path.join(dir, `${file}.json`);
            if (req.method === "GET") {
              return send(res, 200, JSON.parse(await readFile(filePath, "utf8")));
            }
            if (req.method === "PUT") {
              const parsed = schema.safeParse(JSON.parse(await readBody(req)));
              if (!parsed.success) {
                return send(res, 422, { error: "schema", issues: parsed.error.issues.slice(0, 20) });
              }
              await writeFile(filePath, JSON.stringify(parsed.data, null, 2) + "\n");
              return send(res, 200, { ok: true });
            }
          }

          // GET /__review/pages/:file/p-NN.jpg  (file = <slug>-<year>, in data/states or data/national)
          if (req.method === "GET" && parts.length === 3 && parts[0] === "pages") {
            const [, file, page] = parts;
            if (!FILE_RE.test(file) || !PAGE_RE.test(page)) return send(res, 400, { error: "bad path" });
            const raw = await readFile(path.join(DATA_DIR, `${file}.json`), "utf8").catch(() => readFile(path.join(NATIONAL_DIR, `${file}.json`), "utf8"));
            const doc = { source: (JSON.parse(raw) as { source: { dir: string } }).source };
            const pagesDir = path.resolve(ROOT, doc.source.dir, "pages");
            if (!pagesDir.startsWith(path.join(ROOT, "brochures") + path.sep)) {
              return send(res, 400, { error: "source dir must be inside brochures/" });
            }
            try {
              const img = await readFile(path.join(pagesDir, page));
              res.setHeader("Content-Type", "image/jpeg");
              return res.end(img);
            } catch {
              return send(res, 404, { error: `missing ${doc.source.dir}/pages/${page} — run the page render step` });
            }
          }
          next();
        } catch (err) {
          send(res, 500, { error: String(err) });
        }
      });
    },
  };
}

const STATES_ID = "virtual:brochures";
const RESOLVED_STATES_ID = "\0" + STATES_ID;
const SCHEDULES_ID = "virtual:schedules";
const RESOLVED_SCHEDULES_ID = "\0" + SCHEDULES_ID;

/**
 * Provides `virtual:brochures` (data/states) and `virtual:schedules` (data/national): every file on the dev server, but only
 * status "published" files in a production build, so unreviewed drafts never ship.
 * Exception: `INCLUDE_DRAFTS=1` (the `build:preview` script) keeps drafts for a labelled,
 * non-indexed public preview, as the product owner decided on 2026-10-07.
 */
export function brochuresPlugin(): Plugin {
  let isBuild = false;
  const includeDrafts = process.env.INCLUDE_DRAFTS === "1";
  return {
    name: "brochure-data",
    configResolved(config) {
      isBuild = config.command === "build";
      if (isBuild && includeDrafts) {
        config.logger.warn("\n⚠ INCLUDE_DRAFTS=1: this build contains unreviewed draft states (public preview only).\n");
      }
    },
    // A build with drafts must stay out of search engines (netlify.toml also sends X-Robots-Tag).
    transformIndexHtml() {
      if (isBuild && includeDrafts) return [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" }, injectTo: "head" }];
    },
    resolveId(id) {
      if (id === STATES_ID) return RESOLVED_STATES_ID;
      if (id === SCHEDULES_ID) return RESOLVED_SCHEDULES_ID;
    },
    load(id) {
      if (id !== RESOLVED_STATES_ID && id !== RESOLVED_SCHEDULES_ID) return;
      const dir = id === RESOLVED_STATES_ID ? DATA_DIR : NATIONAL_DIR;
      const names = (() => { try { return readdirSync(dir); } catch { return []; } })();
      const entries = names
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          this.addWatchFile(path.join(dir, f));
          return { key: f.replace(/\.json$/, ""), raw: JSON.parse(readFileSync(path.join(dir, f), "utf8")) };
        })
        .filter((e) => !isBuild || includeDrafts || e.raw.status === "published");
      return `export default ${JSON.stringify(entries)};`;
    },
  };
}
