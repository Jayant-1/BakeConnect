'use client';

import React from 'react';
import Link from 'next/link';
import { MailCheck, ArrowRight } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFF8EF]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block group">
          <span className="font-serif text-3xl font-bold tracking-tight text-[#2D211B] group-hover:text-[#9C3D2B] transition">
            Bake<span className="text-[#9C3D2B]">Connect</span>
          </span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/60 sm:rounded-2xl sm:px-10 border border-[#E6DAC8] text-center space-y-5">
          <MailCheck className="w-16 h-16 text-[#9C3D2B] mx-auto" />
          <h2 className="text-2xl font-bold text-[#2D211B] font-serif">
            Verify Your Email Address
          </h2>
          <p className="text-sm text-[#7A685D]">
            We've sent a verification link to your registered email address. Please click the link to confirm your bakery customer or shopkeeper account.
          </p>

          <div className="pt-4 flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#9C3D2B] hover:bg-[#7A2C1D] transition"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="text-xs text-[#7A685D] hover:text-[#2D211B] underline"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
