"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function TeamFilterDropdown({ options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label =
    selected.length === 0 || selected.includes("Tous")
      ? "Tous"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} équipes`;

  const toggle = (opt: string) => {
    if (opt === "Tous") {
      onChange(["Tous"]);
      return;
    }
    let next = selected.filter((s) => s !== "Tous");
    if (next.includes(opt)) next = next.filter((s) => s !== opt);
    else next = [...next, opt];
    if (next.length === 0) next = ["Tous"];
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white min-w-[180px] text-left"
      >
        {label} ▾
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 glass rounded-2xl border border-slate-200 p-2 min-w-[260px] max-h-64 overflow-y-auto shadow-xl">
          <label className="flex items-center gap-2 p-2 text-sm font-bold cursor-pointer hover:bg-white/80 rounded-lg">
            <input type="checkbox" checked={selected.includes("Tous")} onChange={() => toggle("Tous")} />
            Tous
          </label>
          {options.filter((o) => o !== "Tous").map((opt) => (
            <label key={opt} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-white/80 rounded-lg">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
