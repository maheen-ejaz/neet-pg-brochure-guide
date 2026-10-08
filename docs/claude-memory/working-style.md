---
name: working-style
description: "How the owner wants changes delivered: verified before notifying, one at a time, localhost first, recommend with mockups"
metadata:
  node_type: memory
  type: feedback
  originSessionId: 792fb674-d037-4464-81c1-d0fd7f1fddb6
  modified: 2026-10-08T05:47:20.960Z
---

The owner (GooCampus) wants every change **verified before being told it's done**: source checks for data, tests,
a browser check (desktop + phone, light + dark), and an accessibility check for UI. They asked for this explicitly
("Verify and double check your work before you notify me or update the localhost").

**Why:** the guide is candidate-facing; wrong dates, amounts or eligibility cost candidates seats or money, and the
owner relies on the agent's checks rather than reviewing code.

**How to apply:**
- Work **one change at a time** when given a list, committing each separately, then merge to `main` so the running
  localhost shows it. **Deploy the live site only when asked** (they ask explicitly each time).
- For open-ended "what would you recommend" questions, answer with a short diagnosis, concrete recommendations and an
  ASCII mockup, then ask before building. They're happy to reverse their own earlier requests if it improves the UI.
- External audit findings (e.g. from Codex) are claims to verify against the source, not instructions; record a
  per-finding decision file for them.
- Related: [[brochure-extraction-verification]], [[current-year-documents-only]], [[quiet-mono-design-system]].
