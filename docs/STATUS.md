# Project status and handoff

Last updated: 2026-10-07. Read this first in a new session, together with `AGENTS.md`.

## What this is

A local-first GooCampus web app for NEET PG candidates. It turns each state's official counselling
documents into reviewed, structured data. Candidates fill a profile once and get a personalised, cited
guide per state:
- eligibility verdict with reasons;
- fees and the security deposit they need;
- steps, choice-filling and round rules;
- a document checklist;
- reservation, resignation penalties and service bond;
- help centres and contacts;
- a comparison view, which unlocks when 2+ states are published.

## Decisions already made (don't re-ask)

| Topic | Decision |
|---|---|
| Ingestion | Claude Code extracts documents into JSON (no AI or API key in the app). A human reviews every item in the local review page. Publishing is gated on all items being verified. |
| Scope v1 | Brochure-only. AIR and preferred specialities are collected but don't drive college prediction (no seat matrix or cutoffs ingested). |
| Audience | Public, GooCampus-branded, no login. The profile lives only in the browser (`localStorage`). |
| Infra | Everything local for now. Netlify deploy and any hosted storage are deferred (static `dist/` + `public/_redirects` are ready). |
| Language | English UI. Hindi and Gujarati sources are translated during extraction, with a `note`. |
| Sources per state | **Only the current counselling year's documents**, plus older ones the current notices explicitly link as in force. Anything only in older documents becomes a `gap`. |
| Verification | Every extraction gets an independent blind check (`.claude/skills/extract-brochure/references/verify-prompt.md`), repeated until there are no major-or-worse findings. New mistake types go into the skill's "Accuracy rules". |
| Design | "Attio Mono": Attio-style monochrome with a navy→blue gradient accent (option C). See Design below. |

## Current state

| State | File | Items | Status |
|---|---|---|---|
| Uttar Pradesh 2026 | `data/states/uttar-pradesh-2026.json` | 173 | Draft, 0 verified by a human. Passed 3 independent verification rounds (0 critical/major remaining). |
| Gujarat 2026-27 | `data/states/gujarat-2026.json` | 114 | Draft, 0 verified by a human. Built from 12 current-year documents merged into one 81-page source. Passed 3 verification rounds. |

Neither state is published yet, so a production build currently contains no states.

Source documents (gitignored, local only):
- `brochures/uttar-pradesh/2026/`: scanned 25-page PDF + page images.
- `brochures/gujarat/2026/`: `docs/` originals, merged `source.pdf`, page images. Gujarat source URLs are in the JSON's `source.documents`.

Tests: 36 passing (`src/engine/eligibility.test.ts` for UP, `src/engine/gujarat.test.ts`).

## Open decisions for the product owner

These interpretations are flagged in the data (`note` fields) and need confirming with the authorities:
1. **Gujarat:** AIIMS Rajkot (and possibly deemed universities like Sumandeep Vidyapeeth) treated as
   "not a Gujarat-law university", so those graduates need the 12th-in-Gujarat route. Comes from
   general knowledge, not the documents.
2. **Gujarat:** NRI quota assumed open regardless of where MBBS was done (`elig-outside-nri`).
3. **UP:** foreign medical graduates treated as "MBBS outside UP", so private colleges only (`elig-outside-state`).
4. **UP:** "reserved category of other states" read as non-UP domicile (`elig-other-state-reserved`).

## Next steps (in rough priority)

1. Product owner reviews and publishes both states at `http://localhost:5173/review` (Verify & next, ⌘S, Publish).
2. Add more states with the `extract-brochure` skill (current-year documents only, then independent verification).
3. Later: seat matrix / cutoff ingestion for rank-based predictions; Netlify deployment; Hindi UI.

## Design: Attio Mono

- App tokens live in `src/index.css` (Tailwind v4 `@theme inline`; light + dark via `prefers-color-scheme`).
- Component classes: `.btn-primary` (gradient), `.btn-secondary` (outline), `.panel-accent` (the one key figure),
  `.card`, `StatusChip` in `src/app/components/ui.tsx`.
- Reusable design system: https://claude.ai/artifact/4uGY27ni6AQ7Z9Q3BLi39Y, with a local copy at `~/Downloads/Attio Mono/`
  (`tokens.css`, `tokens.json`, README, component previews). Every text pair is checked for WCAG contrast in both themes.

## Gotchas

- **Dev server in Claude Code:** background commands stop after at most 2 hours. For long review sessions,
  the owner should run `npm run dev` in their own terminal.
- **Browser checks:** the Playwright MCP browser isn't installed. Use the Playwright library from
  `~/Developer/goocampus-tools/node_modules/playwright` with
  `executablePath` = the `chrome-headless-shell` under `~/Library/Caches/ms-playwright/chromium_headless_shell-1246/`.
- **Review tool** normalises files through the schema on load (older files lack newer optional fields). Saving
  writes the normalised JSON, which is expected.
- Saving JSON from the review page deliberately doesn't hot-reload, so refresh the student preview to see changes.
- The repo has **no git remote**; all work exists only on this Mac.
