import { useEffect, useState } from "react";
import { badgeFor, type DateKind } from "../deadline";

/** Re-renders every 30 seconds so the countdown stays current. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/**
 * "3 Days Remaining" … "Last Day Today" (with an HH:MM countdown on a deadline's last day).
 * Renders nothing when the date is more than 3 days away or has passed.
 */
export function DeadlineBadge({ date, time, kind = "deadline" }: { date: string; time?: string; kind?: DateKind }) {
  const now = useNow();
  const b = badgeFor(date, time, kind, now);
  if (!b) return null;
  return (
    <span className={`urgency urgency-${b.level}`} role="status">
      {b.level === 0 && <span aria-hidden className="urgency-dot h-1.5 w-1.5 rounded-full bg-current" />}
      {b.label}
      {b.countdown && (
        <span className="font-mono" title={b.endOfDay ? "Time left until 11:59 PM IST (no closing time is printed)" : `Time left until ${time} IST`}>
          · {b.countdown}{b.endOfDay ? " to end of day" : " left"}
        </span>
      )}
    </span>
  );
}
