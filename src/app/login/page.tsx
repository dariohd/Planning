"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/desktop";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#00205b] to-[#04122b] p-6">
      <div className="glass rounded-3xl p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-[#00205b] mb-2">
          Planning Présence
        </h1>
        <p className="text-sm text-slate-500 mb-8">Connexion requise</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors"
          >
            Continuer avec Google
          </button>

          {process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={() => signIn("credentials", { email: "admin@local.dev", callbackUrl })}
              className="w-full py-3 rounded-2xl border-2 border-[#00205b] text-[#00205b] font-bold hover:bg-slate-50 transition-colors"
            >
              Connexion dev (admin)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
