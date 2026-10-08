# StatusChip

A small chip with a leading dot and one word that states a status.

- Variants: good (`good` on `good-tint`), warn (`warn` on `warn-tint`), bad (`bad` on `bad-tint`), neutral (`muted` on `canvas`).
- `caption` size at weight 600, `radius-md` (6–8px), padding 2px 8px, dot 6px in the text colour.
- The consumer provides the word ("Eligible", "Watch out", "Critical", "Draft"). Never colour alone.
- Don't: use status colours for decoration, put more than two words in a chip.
