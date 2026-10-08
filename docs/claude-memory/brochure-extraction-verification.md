---
name: brochure-extraction-verification
description: User wants every state extraction independently verified and mistakes turned into reusable lessons
metadata:
  node_type: memory
  type: feedback
  originSessionId: e664f305-d2be-450b-aaaa-8c66cc50bde6
  modified: 2026-10-06T08:45:41.199Z
---

After extracting any state's counselling documents, run an independent, blind, read-only verification
(fresh subagent, prompt in `.claude/skills/extract-brochure/references/verify-prompt.md`) and fix
findings before handing over. Fold any new kind of mistake into the "Accuracy rules" list in the
extract-brochure skill and add a regression test for eligibility-logic errors.

**Why:** On 2026-10-06 the first verification of UP and Gujarat found 8 major errors (proxy definitions
like "employed in UP" for PMHS, rules scoped too broadly, softened modality, missed fall-through
clauses, wrong citations). The user asked to "learn from these mistakes so we don't make the same
mistakes again".

**How to apply:** Treat verification as part of "done" for any extraction. Report the verification
result in the hand-over. Related: [[current-year-documents-only]].
