# NEET PG Brochure Guide

Local-first GooCampus web app that turns state NEET PG counselling brochures into reviewed,
structured data and shows candidates personalised, cited guidance.

Current status, decisions already made, open questions and next steps: `docs/STATUS.md`.

## Commands

- `npm run dev`: student site at http://localhost:5173, review tool at `/review` (dev only)
- `npm test`: Vitest (eligibility engine)
- `npm run validate`: schema + publish gate for `data/states/*.json`
- `npm run typecheck`
- `npm run check`: typecheck + tests + validate (run before merging)
- `npm run build`: validate, typecheck, static build to `dist/` (published states only)
- `npm run build:preview`: same, but includes draft states (used by the temporary public preview)

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
  the app has no AI/API key), with its accuracy rules and the independent-verification prompt in
  `references/verify-prompt.md`.
- `src/index.css`: "Attio Mono" design tokens (monochrome + navy→blue gradient accent, light/dark).

## Invariants

- Production builds must contain no review code (`grep -r __review dist` is empty). `npm run build` contains no
  draft data; the only exception is the temporary preview (`build:preview`), which labels drafts and is noindexed.
- A file can only be `published` when every sourced item is `verified` (`npm run validate` enforces it).
- Candidate profiles stay in the browser (`localStorage`); nothing about candidates is stored or sent.
- Every candidate-facing fact cites brochure pages. Don't show unsourced claims.
- Use only the current counselling year's documents for a state; older-only rules become `gaps`.
- Every extraction is independently verified (blind subagent, verify-prompt.md) before hand-over.
- Keep the Attio Mono look: neutrals first, status colours only with a word, the gradient only on the
  primary action and the one key figure per view; text pairs ≥4.5:1 in both themes.
- Release: temporary preview at https://neetpg.goocampusglobal.com (Netlify project `goocampus-neetpg`,
  GooCampus Team). Deploy from a clean `main`: `netlify deploy --prod --build` (uses `netlify.toml`).
