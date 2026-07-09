"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type UndoAction =
  | { type: "status"; personnelId: string; date: string; oldStatus: string; oldDetails?: { c?: string; hs?: string; loc?: string } }
  | { type: "details"; personnelId: string; date: string; oldStatus: string; oldComment?: string; oldHs?: string; oldLocation?: string }
  | { type: "mass"; batch: Record<string, Record<string, { s: string; c?: string; hs?: string; loc?: string }>> };

type ToastItem = {
  id: string;
  message: string;
  isError: boolean;
  undo?: UndoAction;
};

type ToastContextValue = {
  showToast: (message: string, opts?: { error?: boolean; undo?: UndoAction }) => void;
  pushUndo: (action: UndoAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const lastUndo = useRef<UndoAction | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, opts?: { error?: boolean; undo?: UndoAction }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const undo = opts?.undo ?? undefined;
      if (undo) lastUndo.current = undo;
      const duration = undo ? 12000 : opts?.error ? 7000 : 5000;
      setToasts((prev) => [...prev.slice(-2), { id, message, isError: Boolean(opts?.error), undo }]);
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const pushUndo = useCallback((action: UndoAction) => {
    lastUndo.current = action;
  }, []);

  const runUndo = async (action: UndoAction) => {
    if (action.type === "status" || action.type === "details") {
      await fetch("/api/presences/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personnelId: action.personnelId,
          date: action.date,
          status: action.oldStatus,
          comment: action.type === "details" ? action.oldComment : action.oldDetails?.c,
          hs: action.type === "details" ? action.oldHs : action.oldDetails?.hs,
          location: action.type === "details" ? action.oldLocation : action.oldDetails?.loc,
        }),
      });
    } else if (action.type === "mass") {
      await fetch("/api/presences/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch: action.batch }),
      });
    }
    lastUndo.current = null;
  };

  return (
    <ToastContext.Provider value={{ showToast, pushUndo }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-right ${
              t.isError ? "bg-red-50 border-red-200 text-red-900" : "bg-white/95 border-[#00b5e2]/30 text-[#00205b]"
            }`}
          >
            <div className="flex-1 text-sm font-bold">{t.message}</div>
            {t.undo && (
              <button
                type="button"
                className="shrink-0 px-3 py-1.5 rounded-xl bg-[#00205b] text-white text-[10px] font-black uppercase"
                onClick={async () => {
                  removeToast(t.id);
                  try {
                    await runUndo(t.undo!);
                    showToast("Modification annulée");
                  } catch {
                    showToast("Erreur lors de l'annulation", { error: true });
                  }
                }}
              >
                Annuler
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
