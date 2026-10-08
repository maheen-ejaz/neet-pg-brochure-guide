import type { KeyboardEvent } from "react";

/**
 * Keyboard support for a group of role="radio" buttons (WAI-ARIA radio group pattern): one tab
 * stop for the group, arrow keys move and select, Home/End jump to the ends.
 */
export function radioProps<T>(options: T[], current: T | null, index: number, onChange: (v: T) => void) {
  const active = current === null ? 0 : options.indexOf(current);
  const focusable = index === (active < 0 ? 0 : active);
  return {
    tabIndex: focusable ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let next: number | null = step === undefined ? null : (index + step + options.length) % options.length;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = options.length - 1;
      if (next === null) return;
      e.preventDefault();
      onChange(options[next]);
      const group = e.currentTarget.closest('[role="radiogroup"]');
      (group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next])?.focus();
    },
  };
}
