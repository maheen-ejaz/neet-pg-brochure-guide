# Handover guide

This guide is for whoever takes over the NEET PG Brochure Guide: to run it, maintain it, add states, or
rebuild it inside another project. Read it with [`STATUS.md`](STATUS.md), which has the current state and
the open decisions, and [`../AGENTS.md`](../AGENTS.md), which lists the commands and rules every change
must keep.

## 1. What you're inheriting

| Asset | Where | Notes |
|---|---|---|
| App code | `src/`, `vite-plugin-review.ts`, `scripts/` | React 19 + Vite 8 + Tailwind 4 + Zod 4, TypeScript. Static site, no backend. |
| Data | `data/states/` (UP, Gujarat, Karnataka 2026), `data/national/` (MCC 2026) | 499 sourced items, all **draft** (0 verified by a person). |
| Source documents | `brochures/<slug>/<year>/` | `source.pdf` + `pages/p-NN.jpg` per document. Gujarat also has its 12 originals in `docs/`. |
| Extraction procedure | `.claude/skills/extract-brochure/` | Claude Code follows `SKILL.md` to extract a new state. `references/verify-prompt.md` is the blind check. |
| Design system | `docs/design-system/`, implemented in `src/index.css` | "Attio Mono": monochrome with a navy→blue gradient on the primary action. |
| Owner preferences | `docs/claude-memory/` | How the previous owner wanted work done and checked. |
| Live preview | https://neetpg.goocampusglobal.com | Netlify project `goocampus-neetpg` (GooCampus Team). Ask GooCampus for access. |
| Tests | `src/**/*.test.ts` | 84 Vitest tests: engine per state, date format, deadlines, seat views, MCC helpers. |

Not included: the external Codex audit package mentioned in `STATUS.md` (81 findings, 07-10-2026). Its
outcome is already applied to the data and code, and STATUS.md summarises the changes it led to, but the
per-finding files didn't survive.

## 2. Run it

```bash
npm install
npm run dev            # http://localhost:5173 (student site), /review (review tool)
npm test               # unit tests
npm run validate       # schema + publish gate for every data file
npm run check          # all three; must pass before merging
npm run build          # production build: published files only, no review code
npm run build:preview  # same but includes drafts (what the live preview runs)
```

The dev server shows drafts with a yellow "Draft preview" banner. A production build (`npm run build`)
includes only files with `"status": "published"`. Today that means none, so the home page is empty.

## 3. Architecture

### Data model (`src/schema/stateBrochure.ts`)

One JSON file per state per counselling year. Everything a candidate reads is a **sourced item**:

```jsonc
{ "id": "elig-clause-b", "sourcePages": [17, 18], "verified": false, "note": "optional reviewer note",
  "seats": ["government"] /* optional: only when the source limits it */, ... }
```

Top-level sections: `meta`, `source`, `process`, `eligibility` (rules + quota terms), `reservation`,
`fees`, `choiceFilling`, `rounds`, `documents`, `admission`, `resignation`, `serviceBond`, `helpdesk`,
`helpCentres`, `nodalCentres`, `disabilityCentres`, `annexures`, `importantDates`, `gaps` (what the documents don't say). Read the schema rather
than this list. It's commented and it is the source of truth.

National schedules (MCC) use `src/schema/nationalSchedule.ts`. State rules can point at MCC rounds with
`schedule: [{ key, round, stages }]`; `npm run validate` checks those links.

### Eligibility engine (`src/engine/`)

Pure functions, with no React and no I/O:

1. `profile.ts`: the candidate profile (course, where MBBS was done, domicile, schooling, category, PwD,
   NRI link, in-service, internship date, and so on).
2. `deriveFacts(profile, brochure)`: turns the profile into facts *relative to that state*
   (`isDomicile`, `mbbsLocation`, `schooledInState`, …). Each fact is three-valued: true, false, or null for
   "not enough information".
3. Each `eligibility.rules[]` item has a `condition` (an `all`/`any`/`not`/`fact in [...]` tree) and an
   `effect` (`ineligible`, `restrictSectors`, `restrictQuotas`, `treatAsCategory`, `excludeCourses`,
   `notCovered`, `note`).
4. `checkEligibility()` evaluates every rule and returns a status (`eligible`, `restricted` = partly
   eligible, `incomplete` = needs details, `notCovered`, `ineligible`), the reasons ordered by impact, and the allowed sectors and quotas.
   `documentsFor()` builds the checklist.

Each state has its own test file (`eligibility.test.ts` for UP, `gujarat.test.ts`, `karnataka.test.ts`)
with real candidate scenarios. Add one whenever a rule's logic changes.

### Data loading (`vite-plugin-review.ts`)

- `brochuresPlugin` provides `virtual:brochures` and `virtual:schedules`. The dev server gets every file;
  builds get only published files unless `INCLUDE_DRAFTS=1` (`build:preview`).
- `reviewPlugin` (dev only, `apply: "serve"`) is a small file API: the review tool reads and saves JSON in
  `data/` and serves page images from `brochures/`.

### UI (`src/app/`)

- `pages/`: Home (state cards sorted by verdict), Profile (4 steps), State (summary card + collapsible
  sections + seat-type switch), Compare (unlocks at 2+ published states), Schedule (MCC timeline).
- `text.ts` + `Prose`/`Marked` in `components/ui.tsx`: split long brochure text into bullets and
  highlight money, percentages, durations and dates.
- `dates.ts`, `deadline.ts`, `schedule.ts`: date formatting ("21st October 2026"), IST urgency badges, MCC
  stage status.
- `seats.tsx`: the All seats / Government / Management & NRI views.

## 4. Routine maintenance

### Review and publish a state (the most important pending job)

1. `npm run dev`, open http://localhost:5173/review and choose a file.
2. For each item, compare it with the page image on the right. Fix the text if needed, then **Verify & next**.
   Save with ⌘S. Saving doesn't hot-reload the student site, so refresh it to see the change.
3. When every item is verified, click **Publish**, then run `npm run check` and commit.
4. Before you publish, settle the open interpretation questions in `STATUS.md` with the counselling authority.

### Add a new state

Use Claude Code in this repo: "extract this brochure: <path to PDF>". It follows
`.claude/skills/extract-brochure/SKILL.md`:

1. Collect **only the current counselling year's documents**. Rules found only in older documents become
   `gaps`.
2. Render pages to `brochures/<slug>/<year>/pages/`, extract into `data/states/<slug>-<year>.json` as a draft.
3. Run the blind verification prompt in a fresh agent, fix the findings, repeat until there are no
   major-or-worse findings. Add any new kind of mistake to the skill's "Accuracy rules".
4. Add `src/engine/<state>.test.ts` with scenarios for the tricky eligibility clauses.
5. Human review and publish as above.

If a state needs a profile question that doesn't exist yet: add the field to `profile.ts` (and
`EMPTY_PROFILE`), the fact to `FACTS` in the schema and `deriveFacts`, the question to `ProfilePage.tsx`,
and tests.

### Update for a new counselling year or a revised notice

- New year: new files (`<slug>-<year+1>.json`, `brochures/<slug>/<year+1>/`), never edits of last year's.
- Revised MCC schedule: replace `brochures/mcc/2026/source.pdf` and its page images, update
  `data/national/mcc-pg-2026.json`, re-verify.

### Deploy the preview

From a clean `main` that passes `npm run check`:

```bash
npm run build:preview
netlify deploy --prod --dir dist --site fb03fe2b-69e5-497f-a789-fcfe1e8167e7
```

Once states are published, switch `netlify.toml` to `npm run build` and remove the `noindex` header.

## 5. Rules not to break

These are enforced by tests or `npm run validate` where possible. The full list is in `AGENTS.md`.

- Every candidate-facing fact cites brochure pages. No unsourced claims.
- `published` only when every item is `verified`.
- Production builds contain no review code (`grep -r __review dist` is empty).
- No candidate data leaves the browser.
- Dates read "21st October 2026"; ranges "21st October 2026 - 22nd October 2026"; date inputs DD-MM-YYYY.
- Accessibility: axe-core WCAG 2.1 AA at 0 violations, text contrast ≥4.5:1 in light and dark.

## 6. Rebuilding it inside another project

The parts are deliberately separable:

| Layer | Portability |
|---|---|
| `data/` + `brochures/` | Plain JSON + files. Use as-is from any stack. |
| `src/schema/` | Zod. Use it anywhere TypeScript runs (server, Next.js, Node scripts) to validate the data. |
| `src/engine/` | Pure TypeScript with no framework imports. Copy the folder and its tests; they should pass unchanged. |
| `src/app/` | React-specific. Port the pages or reuse the components; the visual rules are in `docs/design-system/`. |
| `src/review/` + `vite-plugin-review.ts` | Vite-specific dev tooling. In another stack, replace the file API with your own (or keep this repo as the review/authoring tool and import its `data/` as a package). |

A low-effort integration: keep this repo as the authoring tool (extract, review, publish), and have the
other project consume `data/` plus `src/schema` and `src/engine`, for example as a git submodule or an npm
workspace package.

When porting, carry the tests across first. They encode many hard-won interpretations of the brochures.

## 7. Working with Claude Code here

- `CLAUDE.md` loads `AGENTS.md` and `docs/STATUS.md` automatically.
- `docs/claude-memory/` holds the previous owner's preferences (verify before reporting, one change at a time,
  current-year documents only, design system). To give your own Claude Code the same context, copy those files
  into your project's memory folder (`~/.claude/projects/<project-path>/memory/`) or paste the key points
  into `CLAUDE.md`.
- Keep `docs/STATUS.md` current at the end of each working session. It's what lets the next session (or
  person) start without re-asking settled questions.

## 8. Known gaps

- No item is human-verified, so nothing is published.
- No seat matrix or cutoffs, so AIR and preferred specialities are collected but don't predict colleges.
- Management and NRI fee notices are not yet added (that view is thin on fees).
- English UI only (Hindi and Gujarati sources were translated during extraction).
- Browser checks in this repo used Playwright with a local Chrome headless shell. Install Playwright
  (`npx playwright install chromium`) to repeat them.
