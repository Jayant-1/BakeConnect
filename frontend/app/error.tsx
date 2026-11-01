'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BakeConnect] Root runtime error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FFF7EB] text-[#342421] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border-2 border-[#342421] rounded-3xl p-8 shadow-[6px_6px_0px_#342421] text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 border-2 border-rose-400 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#342421]">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="font-display uppercase text-2xl font-bold tracking-tight text-[#342421] mb-2">
          Something went wrong
        </h1>
        <p className="text-xs text-[#342421]/70 font-medium mb-6 leading-relaxed">
          {error?.message || 'An unexpected error occurred while rendering the bakery storefront.'}
        </p>

        {error?.digest && (
          <div className="mb-6 p-2 rounded-xl bg-gray-50 border border-gray-200 text-[10px] font-mono text-gray-500">
            Error ID: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider text-[#342421] bg-[#FFF7EB] hover:bg-[#FDF4E3] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
