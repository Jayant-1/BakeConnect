'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RetailerOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/retailer');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#FF7836] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
