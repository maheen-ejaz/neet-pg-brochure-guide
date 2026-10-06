import { readFileSync, readdirSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { BrochureSchema } from "./src/schema/stateBrochure.ts";

/**
 * Local-only review API. Registered with `apply: "serve"`, so it never exists in a
 * production build. Lets the /review page read and save data/states/*.json and view
 * brochure page images from the gitignored brochures/ folder.
 */
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "states");
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
      if (file.startsWith(DATA_DIR + path.sep)) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_STATES_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        return [];
      }
    },
    configureServer(server) {
      server.middlewares.use("/__review", async (req, res, next) => {
        try {
          const url = new URL(req.url ?? "/", "http://local");
          const parts = url.pathname.split("/").filter(Boolean);

          // GET /__review/states
          if (req.method === "GET" && parts.length === 1 && parts[0] === "states") {
            const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
            return send(res, 200, files.map((f) => f.replace(/\.json$/, "")));
          }

          // GET|PUT /__review/states/:file
          if (parts.length === 2 && parts[0] === "states") {
            const file = parts[1];
            if (!FILE_RE.test(file)) return send(res, 400, { error: "bad file name" });
            const filePath = path.join(DATA_DIR, `${file}.json`);
            if (req.method === "GET") {
              return send(res, 200, JSON.parse(await readFile(filePath, "utf8")));
            }
            if (req.method === "PUT") {
              const parsed = BrochureSchema.safeParse(JSON.parse(await readBody(req)));
              if (!parsed.success) {
                return send(res, 422, { error: "schema", issues: parsed.error.issues.slice(0, 20) });
              }
              await writeFile(filePath, JSON.stringify(parsed.data, null, 2) + "\n");
              return send(res, 200, { ok: true });
            }
          }

          // GET /__review/pages/:file/p-NN.jpg  (file = <slug>-<year>)
          if (req.method === "GET" && parts.length === 3 && parts[0] === "pages") {
            const [, file, page] = parts;
            if (!FILE_RE.test(file) || !PAGE_RE.test(page)) return send(res, 400, { error: "bad path" });
            const doc = BrochureSchema.parse(JSON.parse(await readFile(path.join(DATA_DIR, `${file}.json`), "utf8")));
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

/**
 * Provides `virtual:brochures`: every data/states/*.json on the dev server, but only
 * status "published" files in a production build, so unreviewed drafts never ship.
 */
export function brochuresPlugin(): Plugin {
  let isBuild = false;
  return {
    name: "brochure-data",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    resolveId(id) {
      if (id === STATES_ID) return RESOLVED_STATES_ID;
    },
    load(id) {
      if (id !== RESOLVED_STATES_ID) return;
      const entries = readdirSync(DATA_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          this.addWatchFile(path.join(DATA_DIR, f));
          return { key: f.replace(/\.json$/, ""), raw: JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf8")) };
        })
        .filter((e) => !isBuild || e.raw.status === "published");
      return `export default ${JSON.stringify(entries)};`;
    },
  };
}
