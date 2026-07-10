import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";

function PhoneIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" strokeLinecap="round" />
    </svg>
  );
}

function DesktopIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="20" strokeLinecap="round" />
    </svg>
  );
}

type LinkProps = {
  lang: Lang;
  className?: string;
};

export function LinkToMobileView({ lang, className = "" }: LinkProps) {
  const label = t(lang, "switch_to_mobile");
  return (
    <Link
      href="/mobile"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-[#00b5e2] text-white hover:bg-[#00a3cc] transition-colors ${className}`}
    >
      <PhoneIcon />
    </Link>
  );
}

export function LinkToDesktopView({ lang, className = "" }: LinkProps) {
  const label = t(lang, "switch_to_desktop");
  return (
    <Link
      href="/desktop"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-[#00205b] hover:bg-slate-50 transition-colors ${className}`}
    >
      <DesktopIcon />
    </Link>
  );
}
