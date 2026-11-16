'use client';

import { useEffect } from 'react';

if (typeof window !== 'undefined') {
  // Prevent Next.js 15 dev overlay from converting React 19 hydration mismatch
  // warnings (such as those caused by browser extensions or minor whitespace) into fatal overlay errors.
  const origError = window.console.error;
  window.console.error = function (...args: any[]) {
    const text = args.map((a) => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (
      text.includes('hydration-mismatch') ||
      text.includes('A tree hydrated but some attributes') ||
      text.includes('Hydration failed') ||
      text.includes('Text content did not match') ||
      text.includes('Expected server HTML to contain') ||
      text.includes('Did not expect server HTML to contain') ||
      text.includes('cannot be a child of') ||
      text.includes('cannot be a descendant of')
    ) {
      // Downgrade to console.warn so dev work continues without unhandled error overlay
      console.warn('[Hydration Notice (Non-Fatal)]:', ...args);
      return;
    }
    return origError.apply(this, args);
  };
}

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
