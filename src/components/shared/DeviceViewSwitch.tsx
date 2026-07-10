import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

type LinkProps = {
  lang: Lang;
  className?: string;
};

export function LinkToMobileView({ lang, className = "" }: LinkProps) {
  const label = t(lang, "switch_to_mobile");
  const hint = t(lang, "switch_to_mobile_hint");
  return (
    <Link
      href="/mobile"
      title={hint}
      className={`px-3 py-2 rounded-xl bg-[#00b5e2] text-white text-sm font-bold hover:bg-[#00a3cc] transition-colors whitespace-nowrap ${className}`}
    >
      {label}
    </Link>
  );
}

export function LinkToDesktopView({ lang, className = "" }: LinkProps) {
  const label = t(lang, "switch_to_desktop");
  const hint = t(lang, "switch_to_desktop_hint");
  return (
    <Link
      href="/desktop"
      title={hint}
      className={`text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 text-[#00205b] hover:bg-slate-50 whitespace-nowrap ${className}`}
    >
      {label}
    </Link>
  );
}
