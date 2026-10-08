---
name: quiet-mono-design-system
description: "User's preferred Attio-style monochrome design system \"Attio Mono\" (with optional navy→blue accent), saved as a Design System artifact for reuse across projects"
metadata:
  node_type: memory
  type: reference
  originSessionId: e664f305-d2be-450b-aaaa-8c66cc50bde6
  modified: 2026-10-06T17:27:09.549Z
---

"Attio Mono" design system (renamed from Quiet Mono): https://claude.ai/artifact/4uGY27ni6AQ7Z9Q3BLi39Y (read `project/README.md`, then `project/tokens.json`).
Monochrome base (white canvas, near-black ink, hairline borders, Inter / Inter Tight, weight-500 body,
radius 5/8/12px, status-only green/amber/red) plus an optional accent layer: 135° gradient
#0f2a5c → #2f6fe4 (dark #1c3f86 → #3a6fd6) on the primary action and one key figure per page.

**Why:** On 2026-10-06 the user said they "absolutely love" this palette (built for the NEET PG guide,
inspired by attio.com) and want to apply it to other projects, adding the gradient on top later.

**How to apply:** When the user asks for a UI in another project without naming a style, offer this system;
apply the base tokens first, accent layer only if wanted. Related: [[brochure-extraction-verification]].

Local copy: ~/Downloads/Attio Mono/ (tokens.css, tokens.json, README.md, components/, cover.html).
