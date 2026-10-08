# Card

A bordered section with a header row and a body; the basic container of every page.

- `surface` fill, 1px `line` border, `radius-lg`, no shadow.
- Header row: optional eyebrow in `caption`/`muted`, title in `title`/`ink`, optional secondary button on the right; separated from the body by a `line` divider.
- Body: padding `space-5` (phone) / `space-6` (desktop). Lists of facts inside are rows split by `line` dividers.
- The consumer provides the title, optional eyebrow and action, and the body content.
- Don't: nest cards more than one level, add coloured left borders or shadows.
