import { useEffect, useState } from "react";

export function usePlanningFilters<T extends Record<string, unknown>>(key: string, defaults: T) {
  const [filters, setFilters] = useState<T>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`planning:${key}`);
      if (raw) setFilters({ ...defaults, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(`planning:${key}`, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters, key, loaded]);

  return [filters, setFilters, loaded] as const;
}
