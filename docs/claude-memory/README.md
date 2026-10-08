# Claude Code memory notes

These are the notes Claude Code kept across sessions while building this project: the previous owner's
preferences and the lessons learned. They're copied here from `~/.claude/projects/<project>/memory/` so the
context isn't lost.

| File | What it says |
|---|---|
| `working-style.md` | Verify every change (sources, tests, browser, accessibility) before reporting it; one change at a time; localhost first, deploy only when asked |
| `brochure-extraction-verification.md` | Every extraction gets a blind independent check; new mistake types become accuracy rules |
| `current-year-documents-only.md` | Use only the current counselling year's documents; older-only rules become `gaps` |
| `quiet-mono-design-system.md` | The "Attio Mono" design system and where it lives |
| `MEMORY.md` | The index Claude Code loads |

To use them with your own Claude Code, copy the `.md` files (except this README) into
`~/.claude/projects/<your-project-path>/memory/`, or fold the points you agree with into `CLAUDE.md`.
The `originSessionId` fields refer to the previous owner's sessions and can be ignored.
