# Button

Two buttons: one filled primary action per view, and outline secondary actions for everything else.

- **Primary**: `primary` fill with `on-primary` text, or, with the accent layer, the `accent-from` → `accent-to` 135° gradient with `on-accent` text. `radius-md`, `label` type, padding 9px 14px, `shadow-xs`.
- **Secondary**: `surface` fill, 1px `line-strong` border, `ink` text, same size and radius. Border darkens to `muted` on hover.
- The consumer provides the label (a verb phrase in sentence case) and the action. Optional trailing → or ↗ for navigation or external links.
- Don't: pill shapes, two primary buttons side by side, coloured secondary buttons, icons without a label.
