---
name: current-year-documents-only
description: "Only use the current counselling year's official documents when extracting a state; older rules become gaps"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e664f305-d2be-450b-aaaa-8c66cc50bde6
  modified: 2026-10-06T08:45:44.673Z
---

When ingesting a state's admissions website, use only documents for the counselling happening this
year (plus older documents the current notices explicitly link as in force). Exclude archives, old
rules/FAQs, previous years' fee/seat lists and cutoffs. Anything only stated in older documents is
recorded as a `gap`, not filled in.

**Why:** The user said (2026-10-06, Gujarat) "I only want the latest documents, pertaining to the
counselling happening this year".

**How to apply:** Triage links by year first. Tell the user what was excluded. Related:
[[brochure-extraction-verification]].
