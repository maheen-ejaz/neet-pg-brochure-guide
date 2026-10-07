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
| Infra | Local-first. Temporary public preview on Netlify at https://neetpg.goocampusglobal.com (project `goocampus-neetpg`, GooCampus Team, Pro). No hosted storage. |
| Public preview | Owner chose (2026-10-07) to show the draft UP and Gujarat data publicly, labelled "Draft" with a check-the-official-website notice, and noindexed. Built with `npm run build:preview`. |
| Language | English UI. Hindi and Gujarati sources are translated during extraction, with a `note`. |
| Sources per state | **Only the current counselling year's documents**, plus older ones the current notices explicitly link as in force. Anything only in older documents becomes a `gap`. |
| Verification | Every extraction gets an independent blind check (`.claude/skills/extract-brochure/references/verify-prompt.md`), repeated until there are no major-or-worse findings. New mistake types go into the skill's "Accuracy rules". |
| Design | "Attio Mono": Attio-style monochrome with a navy→blue gradient accent (option C). See Design below. |

## Current state

| State | File | Items | Status |
|---|---|---|---|
| Uttar Pradesh 2026 | `data/states/uttar-pradesh-2026.json` | 173 | Draft, 0 verified by a human. Passed 3 independent verification rounds (0 critical/major remaining). |
| Gujarat 2026-27 | `data/states/gujarat-2026.json` | 114 | Draft, 0 verified by a human. Built from 12 current-year documents merged into one 81-page source. Passed 3 verification rounds. |
| Karnataka 2026-27 | `data/states/karnataka-2026.json` | 187 | Draft, 0 verified by a human. KEA PGET 2026 Information Bulletin (68 pages, 14-08-2026), live for MDS; PG Medical takes effect after MCC's announcement. |

Neither state is published yet. `npm run build` contains no states; the public preview (`build:preview`) shows both as drafts.

Deploy the preview from a clean `main`: `npm run build:preview && netlify deploy --prod --dir dist --site fb03fe2b-69e5-497f-a789-fcfe1e8167e7`.
First deploy: `6ac5f6e5567267092e0daaac` from commit `0597da2`.

Source documents (gitignored, local only):
- `brochures/uttar-pradesh/2026/`: scanned 25-page PDF + page images.
- `brochures/gujarat/2026/`: `docs/` originals, merged `source.pdf`, page images. Gujarat source URLs are in the JSON's `source.documents`.
- `brochures/karnataka/2026/`: `source.pdf` (the owner's "Karnataka - PGET 2026.pdf") + page images.

Tests: 56 passing (`src/engine/eligibility.test.ts` for UP, `gujarat.test.ts`, `karnataka.test.ts`, `src/app/text.test.ts`).
Profile has a Karnataka-driven question: 10 years of school (1st–12th) in one state (`tenYearStudyState`).

## Open decisions for the product owner

These interpretations are flagged in the data (`note` fields) and need confirming with the authorities:
1. **Gujarat:** AIIMS Rajkot (and possibly deemed universities like Sumandeep Vidyapeeth) treated as
   "not a Gujarat-law university", so those graduates need the 12th-in-Gujarat route. Comes from
   general knowledge, not the documents.
2. **Gujarat:** NRI quota assumed open regardless of where MBBS was done (`elig-outside-nri`).
3. **UP:** foreign medical graduates treated as "MBBS outside UP", so private colleges only (`elig-outside-state`).
4. **UP:** "reserved category of other states" read as non-UP domicile (`elig-other-state-reserved`).
5. **Karnataka:** "Karnataka candidate" (for SC/ST/OBC and PwD reservation) read as Karnataka domicile
   (`elig-reservation-karnataka-only`, `elig-pwd-outside`); clause b/c schooling is the alternative reading.
6. **Karnataka:** foreign graduates shown OPN and NRI seats only (`elig-abroad`). 8.1(c) says Government seats need
   MBBS/BDS from India, but the clause c table row only says "outside Karnataka", which could open Government and
   GMP seats to foreign graduates with 10 years of Karnataka schooling.
7. **Karnataka:** the PG-admission affidavit (Annexure 7) is garbled about how far back "surrendered a seat" reaches
   (`elig-affidavit`).

## Next steps (in rough priority)

1. Product owner reviews and publishes both states at `http://localhost:5173/review` (Verify & next, ⌘S, Publish).
2. Add more states with the `extract-brochure` skill (current-year documents only, then independent verification).
3. Once states are published, switch the preview to `npm run build` (netlify.toml) and drop the noindex header.
4. Later: seat matrix / cutoff ingestion for rank-based predictions; Hindi UI.

## Seat-type views

Each state page has a switch: **All seats | Government | Management & NRI** (`src/app/seats.tsx`). Items carry an
optional `seats` tag only where the source limits them; untagged items show in every view. The Management & NRI
view hides government-only items, puts management/NRI items first and adds an "at a glance" summary. NRI-only items
are labelled "NRI only". The choice is remembered in the browser; NRI profiles start on Management & NRI.
Mappings: UP government colleges / private colleges (no NRI quota); Gujarat GQ / MQ / NQ; Karnataka G / P + Q / N.
Tags were proposed per state, checked against quotes, then blind-verified (0 wrong tags remaining).

## Design: Attio Mono

- App tokens live in `src/index.css` (Tailwind v4 `@theme inline`; light + dark via `prefers-color-scheme`).
- Component classes: `.btn-primary` (gradient), `.btn-secondary` (outline), `.panel-accent` (the one key figure),
  `.card`, `StatusChip` in `src/app/components/ui.tsx`.
- Scannable text: `Prose` (ui.tsx) turns multi-sentence brochure text into bullets, and `Marked` puts a
  highlighter (`.hl`, `--mark` token) on money, %, durations and dates. Matching rules live in `src/app/text.ts`.
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
