---
name: extract-brochure
description: Extract a state NEET PG counselling brochure PDF into a draft data/states/<slug>-<year>.json for human review. Use when the user adds a new brochure PDF or asks to extract/ingest/parse one.
---

# Extract a state brochure

Goal: a schema-valid **draft** that a human verifies item-by-item in the local review page
(`npm run dev` → `/review`). Accuracy over coverage. Never mark anything verified.

## 1. Place the source and render pages

```bash
SLUG=<state-slug>   # e.g. maharashtra
YEAR=<year>
mkdir -p brochures/$SLUG/$YEAR/pages
cp "<the uploaded pdf>" brochures/$SLUG/$YEAR/source.pdf
pdfinfo brochures/$SLUG/$YEAR/source.pdf | grep Pages
pdftotext -layout brochures/$SLUG/$YEAR/source.pdf - | head -c 2000   # empty => scanned
pdftoppm -r 110 -jpeg -jpegopt quality=80 brochures/$SLUG/$YEAR/source.pdf brochures/$SLUG/$YEAR/pages/p
```

`brochures/` is gitignored (official copies stay local). The review page serves these page images.

## 2. Read every page

- If `pdftotext` returns real text, use it, but still view pages that contain tables or flow charts.
- If the PDF is scanned, Read each `pages/p-NN.jpg` image. Read **all** pages, not just the index.
- Translate Hindi or regional-language passages into plain English. Put `"note": "Translated from Hindi"`
  on items whose source is not in English.

## 3. Write `data/states/<slug>-<year>.json`

Follow `src/schema/stateBrochure.ts` exactly. Use `data/states/uttar-pradesh-2026.json` as the worked
example of tone, granularity and ids.

Rules:
- `status: "draft"`, and every item gets `"verified": false`.
- Every item cites `sourcePages` (the brochure's own printed page numbers can differ from PDF page
  numbers, so **use PDF page numbers**, which match `pages/p-NN.jpg`). Only `gaps` may have no page.
- Ids are unique, kebab-case and stable (`elig-…`, `round-…`, `doc-…`, `resign-…`).
- Write for candidates: short, plain sentences, amounts in ₹ with Indian grouping.
- **Eligibility rules**: encode a `condition` over the engine facts (`courseType`, `mbbsLocation`,
  `category`, `isDomicile`, `pwd`, `inService`, `currentlyInPG`, `nationality`, `internshipCompletion`
  with `after`/`onOrBefore`). Use `condition: null` for anything that can't be expressed (shown as
  "check yourself"). Put the home-state institutions that are treated differently (like AMU/BHU/AIIMS
  in UP) in `eligibility.listedHomeInstitutions.names`. Those graduates get `mbbsLocation = "home_listed"`.
  If a rule needs a fact the engine lacks, use `condition: null` and tell the user. Don't invent facts.
- **Interpretations**: if you apply a rule beyond its literal text (e.g. treating FMGs as "outside the
  state"), say so in `note`.
- **Security deposits**: one entry per tier, with `allows` listing every `{sector, collegeType}` it unlocks.
- **Dates**: only real scheduled dates go in `importantDates`. Example dates inside rules don't count.
- **gaps**: list what candidates would expect but the brochure doesn't contain (schedule, seat matrix,
  cutoffs, tuition, college list…).

## 4. Check

```bash
npm run validate   # schema, unique ids, page ranges
npm test           # engine tests must still pass
```

If the state needs engine behaviour that doesn't exist yet (a new fact or effect), stop and propose
the schema/engine change with tests instead of forcing the data to fit.

## 5. Hand over

Tell the user the item count, anything you were unsure about (list the ids), any interpretations, and
to review at `http://localhost:5173/review/<slug>-<year>`. Publishing happens only from the review page
once every item is verified.
