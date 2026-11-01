import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF7EB] text-[#342421] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border-2 border-[#342421] rounded-3xl p-8 shadow-[6px_6px_0px_#342421] text-center">
        <div className="font-display text-6xl font-black text-[#FF7836] mb-2">404</div>
        <h1 className="font-display uppercase text-2xl font-bold tracking-tight text-[#342421] mb-2">
          Page Not Found
        </h1>
        <p className="text-xs text-[#342421]/70 font-medium mb-6 leading-relaxed">
          The bakery shelf or recipe you are looking for has been moved or is no longer in the daily rotation.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Back to Hearth</span>
        </Link>
      </div>
    </div>
  );
}
