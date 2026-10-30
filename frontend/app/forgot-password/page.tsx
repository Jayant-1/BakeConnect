'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFF8EF]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block group">
          <span className="font-serif text-3xl font-bold tracking-tight text-[#2D211B] group-hover:text-[#9C3D2B] transition">
            Bake<span className="text-[#9C3D2B]">Connect</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#2D211B] font-serif">
          Reset your password
        </h2>
        <p className="mt-2 text-sm text-[#7A685D]">
          Enter your registered bakery account email and we'll send you recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/60 sm:rounded-2xl sm:px-10 border border-[#E6DAC8]">
          {submitted ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-[#2D211B]">Check your inbox</h3>
              <p className="text-sm text-[#7A685D]">
                If an account exists for <strong>{email}</strong>, you will receive a secure password reset link shortly.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#9C3D2B] hover:underline"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Email address
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A19183]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#9C3D2B] hover:bg-[#7A2C1D] disabled:opacity-50 transition"
              >
                {isLoading ? 'Sending instructions...' : 'Send Reset Link'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-[#7A685D] hover:text-[#2D211B] underline"
                >
                  Remembered your password? Back to sign in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
