"use client";

import { signOut } from "next-auth/react";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  lang?: Lang;
  message?: string | null;
};

export function AccessDenied({ lang = "fr", message }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00205b] to-[#04122b] p-6">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          {t(lang, "access_denied_badge")}
        </p>
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-[#00205b] mb-3">
          {t(lang, "access_denied_title")}
        </h1>
        <p className="text-sm text-slate-600 mb-8 leading-relaxed">
          {message || t(lang, "access_denied_body")}
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors"
        >
          {t(lang, "logout")}
        </button>
      </div>
    </div>
  );
}
