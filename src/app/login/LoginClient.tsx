"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { t, type Lang } from "@/lib/i18n";

type Props = {
  credentialsFormEnabled: boolean;
  demoLoginEnabled: boolean;
  googleLoginEnabled: boolean;
};

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "fr";
  const code = (navigator.language || "fr").slice(0, 2).toLowerCase();
  if (code === "en" || code === "pt") return code;
  return "fr";
}

function LoginForm({ credentialsFormEnabled, demoLoginEnabled, googleLoginEnabled }: Props) {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"), "/desktop");
  const lang = useMemo(() => detectLang(), []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDemoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("demo", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError(t(lang, "login_error"));
      return;
    }

    window.location.assign(callbackUrl);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00205b] to-[#04122b] p-6">
      <div className="glass rounded-3xl p-10 max-w-md w-full">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-[#00205b] mb-2 text-center">
          {t(lang, "planning")}
        </h1>
        <p className="text-sm text-slate-500 mb-8 text-center">{t(lang, "login_required")}</p>

        <div className="space-y-4">
          {credentialsFormEnabled && (
            <form onSubmit={handleDemoSubmit} className="space-y-3 text-left">
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t(lang, "username")}
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#00205b] outline-none focus:border-[#00b5e2]"
                  placeholder="demo"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t(lang, "password")}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#00205b] outline-none focus:border-[#00b5e2]"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 font-medium" role="alert">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors disabled:opacity-60"
              >
                {loading ? t(lang, "login_loading") : t(lang, "login")}
              </button>
            </form>
          )}

          {googleLoginEnabled && (
            <>
              {credentialsFormEnabled && demoLoginEnabled && (
                <div className="flex items-center gap-3 text-xs text-slate-400 uppercase tracking-widest">
                  <span className="h-px flex-1 bg-slate-200" />
                  {t(lang, "login_or")}
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              )}
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full py-3 rounded-2xl border-2 border-[#00205b] text-[#00205b] font-bold hover:bg-slate-50 transition-colors"
              >
                {t(lang, "google")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LoginClient(props: Props) {
  return (
    <Suspense>
      <LoginForm {...props} />
    </Suspense>
  );
}
