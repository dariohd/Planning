"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9] p-6">
      <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-black text-[#00205b] mb-2">Une erreur est survenue</h1>
        <p className="text-sm text-slate-600 mb-6">
          {error.message || "Impossible d'afficher cette page pour le moment."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
