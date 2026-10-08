# Project status and handoff

Last updated: 2026-10-08. Read this first in a new session, together with `AGENTS.md`.
New to the project? Start with [`HANDOVER.md`](HANDOVER.md) (how to run, maintain, extend and rebuild it).

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
| Uttar Pradesh 2026 | `data/states/uttar-pradesh-2026.json` | 173 | Draft, 0 verified by a human. Passed 3 independent verification rounds + the Codex audit. |
| Gujarat 2026-27 | `data/states/gujarat-2026.json` | 119 | Draft, 0 verified by a human. Built from 12 current-year documents merged into one 81-page source. Passed 3 verification rounds + the Codex audit. |
| Karnataka 2026-27 | `data/states/karnataka-2026.json` | 190 | Draft, 0 verified by a human. KEA PGET 2026 Information Bulletin (68 pages, 14-08-2026), live for MDS; PG Medical takes effect after MCC's announcement. Passed 3 verification rounds + the Codex audit. |
| MCC All India Quota 2026 | `data/national/mcc-pg-2026.json` | 17 | Draft, 0 verified by a human. Tentative MCC schedule (4 pages, generated 07-10-2026): NEET-PG 50% AIQ + 100% deemed/central universities, AFMS registration only. Passed 1 independent check (all 35 stages confirmed). Review at `/review/national/mcc-pg-2026`. |

Nothing is published yet. `npm run build` contains no states; the public preview (`build:preview`) shows all three
states and the MCC timeline as drafts.

Deploy the preview from a clean `main`: `npm run build:preview && netlify deploy --prod --dir dist --site fb03fe2b-69e5-497f-a789-fcfe1e8167e7`.
Deploys: `6ac5f6e5567267092e0daaac` (0597da2, first), `6ac610cc33ebd82b413cc4dd` (9f8fa69, + Karnataka),
`6ac61273d294c43882eb2ea3` (4639518, DD-MM-YYYY), **`6ac6faa756c7dc88da40997e` (9458efe, Codex fixes) = currently live**.

## Where we left off (08-10-2026)

- **Live site (neetpg.goocampusglobal.com) was last recorded at 9458efe.** `main` has moved on since (dates and urgency
  badges, Opens/Closes tables, the simplicity/accessibility pass, verdict bands on state cards). Check Netlify's
  published deploy before the next release. Deploy only when the owner asks.
- The owner works one change at a time and wants every change verified (sources, tests, browser, accessibility)
  before being told it's done; localhost first, live site on request.
- The Codex verification package and the per-finding response (`claude-response.md`) were kept outside the repo and
  are no longer available. Their outcome is applied in the data and code (see "External audit" below).

Source documents (committed under `brochures/`):
- `brochures/uttar-pradesh/2026/`: scanned 25-page PDF + page images.
- `brochures/gujarat/2026/`: `docs/` originals, merged `source.pdf`, page images. Gujarat source URLs are in the JSON's `source.documents`.
- `brochures/karnataka/2026/`: `source.pdf` (the owner's "Karnataka - PGET 2026.pdf") + page images.
- `brochures/mcc/2026/`: `source.pdf` (the owner's "MCC Counselling Schedule.pdf") + page images.

Tests: 84 passing (`npm run check`): engine tests per state, dates/format guard, highlight rules, seat views, MCC
schedule helpers, deadline badges. Accessibility: axe-core WCAG 2.1 AA reports 0 violations on every page.
Profile questions added for states: 10 years of school in one state (`tenYearStudyState`), who is the NRI
(`nriLink`), parent-service home-state route (`parentRouteState`).

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

1. Product owner reviews and publishes the states and the MCC file at `http://localhost:5173/review`
   (Verify & next, ⌘S, Publish). New since the first review: Karnataka `eligibility.quotaTerms` and Gujarat's split
   Important-dates labels.
2. Add more states with the `extract-brochure` skill (current-year documents only, then independent verification).
3. Add each state's current management/NRI fee notices (the Management & NRI view is thin on fees).
4. Once content is published, switch the preview to `npm run build` (netlify.toml) and drop the noindex header.
5. Later: seat matrix / cutoff ingestion for rank-based predictions; Hindi UI.

## External audit (Codex, 07-10-2026)

Codex audited all four data files (81 findings: 4 critical, 57 major, 20 minor). Each finding was re-checked
against the source pages before applying (the per-finding decision file is no longer available). Code changes it led to:
- "Course not covered" now wins over "not eligible" (MDS in Gujarat), and the document list warns about it.
- Profile asks **who is the NRI** (`nriLink`: no one / you / parent / legal guardian when parents are absent /
  sponsoring relative) instead of yes/no; states map it to their own definitions (Gujarat p26, Karnataka p19).
- Profile asks whether a **parent's service gives a home-state route** (`parentRouteState`, Karnataka clauses d–g).
- MCC: "today/now" use IST (server time); same-day stage times shown; the MDS note is always visible.

## MCC timeline

`/mcc/mcc-pg-2026` shows the four AIQ rounds (DD-MM-YYYY, MCC server time), the next deadline (time-aware) and
done/open/upcoming status per stage, with a "Tentative" label and the document date. Home page card + "MCC dates"
nav link. Four state rules link to MCC dates (Karnataka `round2-aiq`, `round3-eligibility`, `round-stray`; UP
`stray-other-admission`); MDS profiles see a warning because the schedule doesn't mention MDS. When MCC revises the
schedule, replace `brochures/mcc/2026/source.pdf`, update the JSON and re-verify.

## Simplicity and accessibility pass (08-10-2026)

- axe-core (WCAG 2.1 AA + best practice) reports 0 violations on every page, light and dark, with and without a
  profile; no tap target under 24px; minimum text 13px (base `html { font-size: 106.25% }`).
- State pages: "Your summary" card (verdict, next deadline, upfront cost, documents), reference sections collapse
  (`Section collapsible`), round rules fold per round, long info cards show 2 bullets + "Show more" (warnings and
  critical rules always in full), current section highlighted in the menu. Phone length: Gujarat ~25 → ~13 screens.
- Verdict: plain meanings of seat codes (`eligibility.quotaTerms`, sourced), "General (UR)", reasons ordered by impact.
- Profile: 4 steps with progress, "None of these apply to me", AIR/specialities optional.
- Highlights only money, percentages, dates and consequential durations; long citations collapse to "Sources (n)".

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
- Reusable design system: https://claude.ai/artifact/4uGY27ni6AQ7Z9Q3BLi39Y, with a copy in `docs/design-system/`
  (`tokens.css`, `tokens.json`, README, component previews). Every text pair is checked for WCAG contrast in both themes.

## Gotchas

- **Dev server in Claude Code:** background commands stop after at most 2 hours. For long review sessions,
  the owner should run `npm run dev` in their own terminal.
- **Browser checks:** Playwright isn't a dependency of this repo. Install it (`npx playwright install chromium`) or point
  an existing Playwright install at a Chrome headless shell. `docs/images/shots.mjs` shows the pattern used for
  the README screenshots.
- **Review tool** normalises files through the schema on load (older files lack newer optional fields). Saving
  writes the normalised JSON, which is expected.
- Saving JSON from the review page deliberately doesn't hot-reload, so refresh the student preview to see changes.
- Repo: https://github.com/maheen-ejaz/neet-pg-brochure-guide (public, MIT; `brochures/` excluded from the licence).
- Previous owner's Claude Code memory notes are in `docs/claude-memory/`.
