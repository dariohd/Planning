"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

type Props = {
  demoLoginEnabled: boolean;
  googleLoginEnabled: boolean;
};

function LoginForm({ demoLoginEnabled, googleLoginEnabled }: Props) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/desktop";
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
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }

    window.location.href = callbackUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00205b] to-[#04122b] p-6">
      <div className="glass rounded-3xl p-10 max-w-md w-full">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-[#00205b] mb-2 text-center">
          Planning Présence
        </h1>
        <p className="text-sm text-slate-500 mb-8 text-center">Connexion requise</p>

        <div className="space-y-4">
          {(demoLoginEnabled || process.env.NODE_ENV !== "production") && (
            <form onSubmit={handleDemoSubmit} className="space-y-3 text-left">
              <div>
                <label htmlFor="username" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Identifiant
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
                  Mot de passe
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
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors disabled:opacity-60"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          )}

          {googleLoginEnabled && (
            <>
              {demoLoginEnabled && (
                <div className="flex items-center gap-3 text-xs text-slate-400 uppercase tracking-widest">
                  <span className="h-px flex-1 bg-slate-200" />
                  ou
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
              )}
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl })}
                className="w-full py-3 rounded-2xl border-2 border-[#00205b] text-[#00205b] font-bold hover:bg-slate-50 transition-colors"
              >
                Continuer avec Google
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
