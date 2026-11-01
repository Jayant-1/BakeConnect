import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8 bg-[#FFFDF9]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-[#342421]/20 border-t-[#FF7836] rounded-full animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/60">
          Warming the Ovens...
        </span>
      </div>
    </div>
  );
}
