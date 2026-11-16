'use client';

import { useEffect } from 'react';

/**
 * Listens for stale Turbopack / Webpack chunk load failures on the window
 * and triggers an auto-reload once to recover.
 * Uses useEffect to run purely on the client with zero SSR impact or hydration mismatches.
 */
export function ChunkRecoveryListener() {
  useEffect(() => {
    function checkChunkErr(msg?: string | null) {
      if (
        msg &&
        (msg.includes('Failed to load chunk') ||
          msg.includes('Loading chunk') ||
          (msg.includes('chunk') && msg.includes('failed')))
      ) {
        const key = 'bc_chunk_reload_ts';
        const last = sessionStorage.getItem(key);
        const now = Date.now();
        if (!last || now - parseInt(last, 10) > 6000) {
          sessionStorage.setItem(key, String(now));
          window.location.reload();
        }
      }
    }

    const handleError = (e: ErrorEvent) => checkChunkErr(e?.message);
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e?.reason?.message || (typeof e?.reason === 'string' ? e.reason : '');
      checkChunkErr(msg);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
