# NEET PG Brochure Guide

![GooCampus NEET PG Guide: state counselling brochures, explained and cited](docs/images/banner.png)

A GooCampus web app for NEET PG candidates. It turns each state's official counselling documents into
reviewed, structured data, then shows each candidate a personalised guide with citations: whether they're
eligible and why, fees and the security deposit, steps and round rules, a document checklist, resignation
penalties, service bond, help desks and MCC (All India Quota) deadlines. **Every fact links to the brochure
page it came from.**

- **Live preview:** https://neetpg.goocampusglobal.com (all data is labelled *Draft*)
- **Status:** Uttar Pradesh, Gujarat, Karnataka, Tamil Nadu and Kerala 2026, plus the MCC 2026 schedule, have been extracted and
  checked by independent AI verification. **No item has been verified by a person yet**, so nothing is published.
- **Taking this project over?** Read [`docs/HANDOVER.md`](docs/HANDOVER.md) first, then
  [`docs/STATUS.md`](docs/STATUS.md).

| Personalised state guide | Review tool (each fact beside its source page) |
|---|---|
| ![Karnataka guide](docs/images/state.png) | ![Review tool](docs/images/review.png) |
| **MCC All India Quota timeline** | **Dark mode** |
| ![MCC timeline](docs/images/mcc.png) | ![Dark mode](docs/images/state-dark.png) |

## Quick start

Requires Node 22+.

```bash
npm install
npm run dev        # student site: http://localhost:5173   review tool: http://localhost:5173/review
npm run check      # typecheck + tests + data validation (run before every merge)
```

The app has no backend, no database, no login and no API keys. Candidate profiles stay in the browser
(`localStorage`).

## How it works

```
official PDFs ──► Claude Code extracts ──► data/states/*.json ──► human reviews ──► npm run build ──► static site
(brochures/)      (extract-brochure skill)  (draft, every fact     at /review, ticks   (published files
                  + blind AI verification    cites pages)          Verified, Publishes  only)
```

1. **Sources** (`brochures/<state>/<year>/`): the official PDF(s) and one image per page.
2. **Extraction** (`.claude/skills/extract-brochure/`): a written procedure that Claude Code follows to
   turn the PDF into JSON. A separate blind check (`references/verify-prompt.md`) is repeated until it finds no
   major errors.
3. **Data** (`data/states/*.json`, `data/national/*.json`): every fact is a *sourced item* with `sourcePages`
   and `verified`. The Zod schema in `src/schema/` is the single source of truth.
4. **Review** (`/review`, dev server only): each item sits next to its source page. A reviewer fixes,
   verifies and finally publishes. `npm run validate` refuses `published` unless every item is verified.
5. **App** (`src/app/`, `src/engine/`): a pure eligibility engine turns the profile into facts, applies the
   state's rules and returns a verdict with reasons. The React UI renders it in the "Attio Mono" design.

## Repository map

| Path | What it is |
|---|---|
| `src/schema/` | Zod schemas for state brochures and national schedules |
| `src/engine/` | Eligibility, deposit and document logic (pure, unit-tested) |
| `src/app/` | Candidate-facing UI (React 19, React Router 7, Tailwind 4) |
| `src/review/` | Review tool, only loaded in dev; never in production builds |
| `vite-plugin-review.ts` | Dev-only file API for the review tool + the `virtual:brochures` data module |
| `scripts/validate.ts` | Schema + publish-gate check for all data files |
| `data/` | The extracted data (one JSON per state-year, one per national schedule) |
| `brochures/` | Official source documents and page images |
| `docs/audits/` | Source audit coverage and unresolved brochure questions |
| `.claude/skills/extract-brochure/` | Extraction procedure, accuracy rules and verification prompt |
| `docs/HANDOVER.md` | How to rebuild, maintain and extend the project |
| `docs/STATUS.md` | Current state, decisions made, open questions, next steps |
| `docs/design-system/` | The "Attio Mono" design system (tokens, components, rules) |
| `docs/claude-memory/` | Working preferences and lessons the previous owner taught Claude Code |
| `AGENTS.md` / `CLAUDE.md` | Commands and invariants for AI coding agents |

## Licence

Code and documentation: [MIT](LICENSE). The documents in `brochures/` are official publications of the
state counselling authorities and the Medical Counselling Committee. They're included for reference and
citation only, are not covered by the MIT licence, and remain with their publishers.

This guide summarises official documents and is not affiliated with any counselling authority. Always check
the official website before acting.
