# NEET PG Brochure Guide

Local-first GooCampus web app that turns state NEET PG counselling brochures into reviewed,
structured data and shows candidates personalised, cited guidance.

## Commands

- `npm run dev`: student site at http://localhost:5173, review tool at `/review` (dev only)
- `npm test`: Vitest (eligibility engine)
- `npm run validate`: schema + publish gate for `data/states/*.json`
- `npm run typecheck`
- `npm run check`: typecheck + tests + validate (run before merging)
- `npm run build`: validate, typecheck, static build to `dist/` (published states only)

## Architecture

- `src/schema/stateBrochure.ts`: Zod schema; single source of truth for state data.
- `data/states/<slug>-<year>.json`: one file per brochure (committed). Every fact is a sourced item
  with `sourcePages` and `verified`.
- `brochures/<slug>/<year>/`: source PDF + page renders. **Gitignored**, local only.
- `src/engine/`: pure eligibility/deposit/document logic. Profile → facts → rules → verdict.
- `src/app/`: student UI. `src/review/`: review UI, loaded only when `import.meta.env.DEV`.
- `vite-plugin-review.ts`: `reviewPlugin` (dev-only file API for the review page) and
  `brochuresPlugin` (`virtual:brochures`: all files in dev, only `status: "published"` in builds).
- `.claude/skills/extract-brochure/SKILL.md`: procedure for extracting a new brochure (done by Claude Code;
  the app has no AI/API key).

## Invariants

- Production builds must contain no draft data and no review code (`grep -r __review dist` is empty).
- A file can only be `published` when every sourced item is `verified` (`npm run validate` enforces it).
- Candidate profiles stay in the browser (`localStorage`); nothing about candidates is stored or sent.
- Every candidate-facing fact cites brochure pages. Don't show unsourced claims.
- Release: none yet. Netlify deployment is deferred (static `dist/`, `public/_redirects` for SPA routes).
