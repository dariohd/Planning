"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode, InitialData } from "@/lib/types";

export function useDesktopData(mode: AppMode, showArchived: boolean) {
  const [data, setData] = useState<InitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const lastModifiedRef = useRef<string>("0");

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    const archived = showArchived ? "&archived=true" : "";
    const res = await fetch(`/api/initial-data?mode=${mode}${archived}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erreur de chargement");
      setAccessDenied(res.status === 403);
      setData(null);
    } else {
      setData(json);
      lastModifiedRef.current = String(json.lastModified ?? "0");
    }
    setLoading(false);
  }, [mode, showArchived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
    void loadInitial();
  }, [loadInitial]);

  const pollUpdates = useCallback(
    async (onChanged: () => void) => {
      const res = await fetch(`/api/updates?since=${lastModifiedRef.current}&mode=${mode}`);
      const json = await res.json();
      if (json.hasChanges && json.newData) {
        setData(json.newData);
        lastModifiedRef.current = String(json.lastModified);
        onChanged();
      } else if (json.lastModified) {
        lastModifiedRef.current = String(json.lastModified);
      }
    },
    [mode]
  );

  return { data, loading, error, accessDenied, loadInitial, pollUpdates, lastModifiedRef };
}
