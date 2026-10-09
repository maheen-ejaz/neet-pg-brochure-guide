# Rendered-fact audit — 9 October 2026

This audit checks facts already exposed by the integrated web app against its supplied sources.
It does not look for new brochure omissions. The frozen app/data commit is
`b824b5d5b444ec870e173f37aba8b1c53a6b179b`; later sharing-artwork changes do not change that input.
Tamil Nadu and Kerala are integrated drafts, but the public site had not yet received that release.

## Evidence and scope

- [Manifest](manifest.json): all five state guides and the MCC schedule, 2,906 inventory fields.
- [Frozen inputs](inputs/): rendered fields, seat scope and machine conditions, with authored notes removed.
  Some inventory fields are internal identifiers or labels; auditors explicitly classify those as
  `not_factual` when they do not express a displayed fact.
- Per-guide reports: [Gujarat](gujarat-2026.json), [Karnataka](karnataka-2026.json),
  [Kerala](kerala-2026.json), [Tamil Nadu](tamil-nadu-2026.json),
  [Uttar Pradesh](uttar-pradesh-2026.json), [MCC](mcc-pg-2026.json).
  Every field has individual claim results. Lists, figures, dates, qualifications and source conflicts
  are split into atomic claims. Shared UI templates and profile-derived outputs have separate audits.
- [Original email reconciliation](email-reconciliation.json) maps all 97 questions to the relevant fields.
  [Independent case review](email-cases-source-review.json) separates source fidelity from a usable
  authority answer. The original uncertainty register remains unchanged as a historical record.

The six first-pass source auditors had access to the cleaned input, original PDF/text/page images and
the app/schema/engine code. They were excluded from authored extraction notes, prior audit reports,
the 97-question email and each other's findings. Each used `gpt-6-luna` with maximum reasoning, as
required by the shared agent instructions. Source evidence was strengthened after citation-quality
checks; false-positive findings were removed after checking the actual text and render conditions.
The separate 97-case reviewer intentionally received the old questions and is not described as blind.

`confirmed` means the supplied source supports that exact claim. It does **not** resolve an internal
source conflict, prove a candidate meets a condition, establish a live website's completeness, or
make a record human-verified. `unresolved` and `contradicted` remain explicit. Absence claims use
scoped full-source inspection rather than invented quotations. One MCC navigation URL is confirmed
from the official primary website and identified as external evidence.

## Original email questions

| Assessment | Cases |
|---|---:|
| Resolved by the supplied source | 17 |
| Clear requirement; candidate/profile/document check still needed | 15 |
| Source conflict or operative ambiguity; authority needed | 36 |
| Additional current document or notice needed | 25 |
| Clearer source scan needed | 2 |
| App metadata rather than a factual uncertainty | 2 |
| Total | 97 |

The review also corrects the page reference for question 078: the DNB 1899 stamp-law sentence is
on original PDF page 34 / merged page 125. It leaves the underlying stamp-law inconsistency unresolved.

## Reproduce the integrity check

Run `python3 docs/audits/rendered-facts/validate.py`. It checks unique field/claim coverage, paths,
snapshot identity, legal verdicts, source-page ranges, evidence presence and all 97 unique questions.
It is an integrity check, not a replacement for reading the source evidence.

Corrections and their subsequent checks are recorded separately from the frozen findings. None of
these automated audit results changes a human `verified` flag or publishes a state.

## Findings and corrections

The frozen field ledger contains 6,607 atomic claims: 5,815 confirmed against the source, 168
unresolved, 621 non-factual labels/metadata, and three contradicted claims. The three data corrections
restore the DNB Clause 33(d) reference, the full “Traumatology and Surgery” specialty name, and the
distinction between EWS appearing in an NBEMS cutoff table and unspecified Karnataka EWS rules.
The supplemental audits cover 182 UI-template and derived-output claims.

[Corrections](corrections.json) record the original and revised values. The app also suppresses
definitive eligibility/category/deposit conclusions when prerequisites cannot be checked, avoids
incomplete upfront fee totals, applies printed closing minutes to deadline status, preserves closing
times in collapsed college steps, labels calculated reservation remainders, and scopes empty states
and board counts to the actual guide/seat view.

The one [independent implementation/source reviewer](independent-review.json) cleared the revised
scope after source and citation corrections. [Checks](checks.json) record 108 passing tests,
typecheck/schema validation and both builds; [browser evidence](browser-corrections.json) records
synthetic profiles, seat-filter counts and live clock-boundary checks. Source documents and human
verification flags are unchanged. Local work took about 82 minutes before delivery.

The source ambiguities are not declared resolved by changing the app. The 63 source-conflict,
missing-document and scan cases still need authority/current-document evidence; another 15 cases
require candidate-specific checks. The localhost-only design hold remains in force, so this audit
does not claim a new public deployment.
