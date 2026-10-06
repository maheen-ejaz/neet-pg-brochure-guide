import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_PROFILE, type Profile } from "../engine/profile";

const KEY = "neetpg-guide:profile:v1";
const listeners = new Set<() => void>();
let cache: Profile | null = null;

function read(): Profile | null {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY_PROFILE, ...JSON.parse(raw) } : null;
  } catch {
    cache = null;
  }
  return cache;
}

/** Profile lives only in this browser. Storage failures (private mode etc.) fall back to memory. */
export function useProfile() {
  const profile = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
  const save = useCallback((p: Profile | null) => {
    cache = p;
    try {
      if (p) localStorage.setItem(KEY, JSON.stringify(p));
      else localStorage.removeItem(KEY);
    } catch {
      /* in-memory only */
    }
    listeners.forEach((l) => l());
  }, []);
  return { profile, save };
}
