import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f9] p-6">
      <div className="glass rounded-3xl p-8 max-w-md w-full text-center">
        <h1 className="text-xl font-black text-[#00205b] mb-2">Page introuvable</h1>
        <p className="text-sm text-slate-600 mb-6">Cette adresse n&apos;existe pas dans Planning Présence.</p>
        <Link
          href="/desktop"
          className="inline-block w-full py-3 rounded-2xl bg-[#00205b] text-white font-bold hover:bg-[#00b5e2] transition-colors"
        >
          Retour au planning
        </Link>
      </div>
    </div>
  );
}
