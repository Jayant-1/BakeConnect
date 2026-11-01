'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[BakeConnect] Global error caught:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FFF7EB] text-[#342421] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white border-2 border-[#342421] rounded-3xl p-8 shadow-[6px_6px_0px_#342421] text-center">
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#342421] mb-2">
            Application Error
          </h1>
          <p className="text-xs text-[#342421]/70 font-medium mb-6">
            {error?.message || 'A critical error occurred while loading the application.'}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] transition-all"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
