# NEET PG Brochure Guide

Local-first GooCampus tool that turns state NEET PG counselling brochures into personalised, visual
guidance: eligibility with reasons, the security deposit you need, steps, choice-filling and round
rules, a document checklist, resignation penalties, service bond, colleges and help desk. Every fact
cites its brochure page.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Add a state brochure

1. Ask Claude Code to extract it (it follows `.claude/skills/extract-brochure/SKILL.md`). It renders the
   pages, reads them, and writes `data/states/<state>-<year>.json` as a draft.
2. Open http://localhost:5173/review. Each extracted item sits next to the brochure page it came from.
   Fix anything wrong, then tick **Verified** (or **Verify & next**). Save with ⌘S.
3. Click **Publish** once every item is verified. Only published states are included in `npm run build`.

Drafts are visible on the dev server, with a "Draft preview" banner, so you can preview the student view
while reviewing.

## Checks

```bash
npm run check      # typecheck + tests + data validation
npm run build      # production build in dist/
```
