"use client";

import { useState } from "react";
import { helpDatabase, type HelpLang } from "@/lib/help-database";

type Props = { lang?: HelpLang };

export function HelpChatbot({ lang = "fr" }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const db = helpDatabase[lang] ?? helpDatabase.fr;
  const categories = Object.entries(db);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 w-12 h-12 rounded-full bg-[#00205b] text-white shadow-lg font-black text-lg"
        title="Aide"
        aria-label="Centre d'aide"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => { setOpen(false); setCategory(null); }}>
          <div className="glass rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-black text-[#00205b]">Centre d&apos;aide</h3>
              <button type="button" onClick={() => { setOpen(false); setCategory(null); }} className="text-slate-400 font-bold px-2">✕</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {!category ? (
                <div className="grid gap-2">
                  {categories.map(([key, cat]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      className={`text-left rounded-2xl p-4 border font-bold ${cat.color}`}
                    >
                      {cat.title}
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <button type="button" onClick={() => setCategory(null)} className="text-xs font-bold text-[#00b5e2] mb-3">← Retour</button>
                  <h4 className="font-black text-[#00205b] mb-4">{db[category].title}</h4>
                  <div className="space-y-3">
                    {db[category].questions.map((item) => (
                      <div key={item.q} className="rounded-xl border bg-white/80 p-3">
                        <p className="text-sm font-black text-[#00205b] mb-1">{item.q}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
