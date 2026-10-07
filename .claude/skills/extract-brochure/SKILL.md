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

### States that publish many documents instead of one brochure

Some states (e.g. Gujarat) publish a set of notices on a website instead of a single brochure.
1. From the admissions website, take **only this year's counselling documents**, plus any older
   document the current notices explicitly link as in force. Skip archives, previous years' rules, FAQs,
   fee/seat lists and cutoffs from earlier years, refund lists and NBE notices.
2. If key rules exist only as website text, snapshot the page to PDF (headless Chrome `--print-to-pdf`).
3. Keep the originals in `brochures/$SLUG/$YEAR/docs/`, merge them in a fixed order with
   `pdfunite … source.pdf`, and record each one in `source.documents` (`title`, `url`, `issued`,
   `startPage`, `pageCount`). Citations use merged-file page numbers, and the UI shows them as
   "<document> p. N". `npm run validate` checks that the ranges tile the merged PDF.
4. Anything this year's documents don't state (reservation %, bond, resignation penalties…) goes in
   `gaps`. Don't fill it in from older documents.

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
  Other available facts: `schooledInState`, `bornInState` and `isNri`. Effects: `restrictQuotas` (e.g. NRI-only)
  and `notCovered` (course not part of this year's notice). Optional sections: `helpCentres`;
  `reservation.policy`/`conversion` can be `null` when not stated.
  If a rule needs a fact the engine lacks, use `condition: null` and tell the user. Don't invent facts.
- **Interpretations**: if you apply a rule beyond its literal text (e.g. treating FMGs as "outside the
  state"), say so in `note`.
- **Security deposits**: one entry per tier, with `allows` listing every `{sector, collegeType}` it unlocks.
- **Dates**: `importantDates` holds real scheduled dates *and* fixed deadlines stated as rules (internship
  cut-offs, certificate "issued on or after" dates). Illustrative example dates inside rules don't count.
- **gaps**: list what candidates would expect but the brochure doesn't contain (schedule, seat matrix,
  cutoffs, tuition, college list…).

## 3b. Accuracy rules (lessons from the UP/Gujarat 2026 verification)

These mistakes were all found by independent checks. Avoid them on the first pass:

1. **Scope every rule exactly.** Record who a rule covers: course type, quota, seat type and college
   sector. ✗ The PMHS weightage note was shown to MDS candidates, though it applies to MD/MS/Diploma only.
   ✗ "5% PwD reservation" left out "Government State Quota seats only".
2. **Map defined groups to their definition, not a proxy.** "PMHS / in-service" means *on the official
   list or sponsored with an NOC* (`inService` needs `inServiceListed`), not "employed in the state".
   "Admitted under these rules" means a prior admission through *this* state's counselling
   (`priorAdmissionInState`), not "currently in any PG seat". UP's "admitted on the basis of an
   *earlier* NEET-PG/MDS" excludes this year's seats and other exams (INI-CET).
   **The profile question must ask the defined group word for word, including its time scope and
   its route** (which exam, which year, which counselling). If no existing question matches, add or
   relabel one rather than reusing a near-match. This mistake recurred after the first fix round.
3. **Keep the source's modality.** Keep "may" as "may", "will" as "will", and "not permitted" as
   "not permitted". ✗ "Not permitted to vacate" was softened to "not normally allowed". ✗ "Will face
   legal action" became "may".
4. **Capture fall-through and escalation clauses.** For example: "if you resign after this window, the
   next stage's penalties apply". These are often a single sentence and easy to miss.
5. **Capture every criterion in a definition or format.** That includes guardian rules in NRI
   definitions, asset limits and caste exclusions in EWS formats, and "father alive" conditions.
   Don't compress a list of criteria into "meets the criteria".
6. **Admission-stage obligations are documents.** Bonds to sign, affidavits, UDID cards and NOCs all go
   in `documents` with the right `appliesWhen`.
7. **Gate documents on the effective situation.** If a rule re-categorises a candidate (e.g. other-state
   reserved → UR), don't ask them for the reserved-category certificate.
8. **Read operational constraints against dates.** Help-centre hours, Saturday half-days, Sunday and
   holiday closures, and "prior appointment compulsory" belong next to the dates they affect.
9. **Cite the exact page.** Don't cite a page because it's in the same document; open it and check. ✗
   Several citations pointed to a neighbouring page. Facts often sit in footers, screenshots and
   form fields (e.g. contact numbers in footers, declarations in form screenshots).
10. **Quote verbatim when the source is ambiguous** (e.g. run-on table cells) rather than imposing a
   reading.
11. **Nothing from general knowledge or out-of-scope documents** in candidate-facing text. Put
   suggestions to verify in `note`, labelled as such.
12. **Don't add a facility name that isn't in the source** (✗ "(DGME)"), and record aliases when two
    documents name the same place differently.
13. **Check reviewer suggestions against the source before applying them.** ✗ A checker suggested "the refund
    lists show forfeiture happens". Applied unchecked, it turned out to be a misreading: the lists track
    payment success, and they're from last year. Every fix needs its own quote and page.
14. **Keep hedges in the candidate-facing text, not only in `note`.** If a rule is an inference, the
    explanation itself should say "appears to" or "confirm with <authority>".
15. **Encode the exceptions with the requirement** (Karnataka 2026). When a document relaxes a requirement
    for named groups (e.g. clauses d–g count study outside the state toward the 10-year rule), a rule that
    restricts everyone failing the requirement is too strict. Mention the exception in the restricting rule,
    and point the profile question at it where possible.
16. **Check every version of a definition** (Karnataka 2026). Prose and tables can define the same clause
    differently (8.1(c) "located in India" vs the clause table's "outside Karnataka"; GMH in the prose vs the
    allotment table). Encode the reading each seat type actually references and note the conflict.
17. **Read annexure tables and NBE notices for numbers** (Karnataka 2026). Qualifying cut-offs (percentile and
    score per category) sat only in an annexure image and were missed on the first pass.

## 4. Check

```bash
npm run validate   # schema, unique ids, page ranges
npm test           # engine tests must still pass
```

Then run an **independent verification**. This is mandatory before handing over. Launch a fresh
read-only subagent, which hasn't seen your extraction reasoning, with the prompt in
`references/verify-prompt.md`. It checks every item against the page images and lists omissions and
interpretations. Fix what it finds, add a regression test for any eligibility-logic error, and re-run
it until it reports no errors of major severity or above. Any new *kind* of mistake goes into the
list in 3b.

If the state needs engine behaviour that doesn't exist yet (a new fact or effect), stop and propose
the schema/engine change with tests instead of forcing the data to fit.

## 5. Hand over

Tell the user the item count, the verification result, anything you were unsure about (list the ids),
any interpretations, and
to review at `http://localhost:5173/review/<slug>-<year>`. Publishing happens only from the review page
once every item is verified.
