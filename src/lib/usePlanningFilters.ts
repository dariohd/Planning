import { useEffect, useState } from "react";

function readStored<T extends Record<string, unknown>>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(`planning:${key}`);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults;
}

export function usePlanningFilters<T extends Record<string, unknown>>(key: string, defaults: T) {
  const [filters, setFilters] = useState<T>(() => readStored(key, defaults));

  useEffect(() => {
    try {
      localStorage.setItem(`planning:${key}`, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters, key]);

  return [filters, setFilters, true] as const;
}
