'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, CheckCircle2, RotateCcw, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const handleResetForm = () => {
    setEmail('');
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFF7EB] text-[#342421]">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 group mb-4">
          <div className="relative w-12 h-12 rounded-2xl bg-white border-2 border-[#342421] p-1.5 shadow-[2px_2px_0px_#342421] group-hover:scale-105 transition-transform flex items-center justify-center">
            <Image
              src="/images/logo-icon.png"
              alt="BakeConnect Emblem"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <span className="font-display text-2xl uppercase tracking-wider text-[#342421] leading-none block">
              Bake<span className="text-[#FF7836]">Connect</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#342421]/60 font-bold">
              Pune Neighbourhood Bakery
            </span>
          </div>
        </Link>
        <h1 className="font-display uppercase text-3xl font-extrabold text-[#342421] tracking-tight">
          RESET PASSWORD
        </h1>
        <p className="mt-1 text-xs text-[#342421]/70 font-medium">
          Enter your registered email address and we&apos;ll send you recovery instructions
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFF7EB] py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421]">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-600 text-emerald-700 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#342421]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h2 className="font-display uppercase text-2xl font-bold text-[#342421]">
                CHECK YOUR INBOX
              </h2>

              <p className="text-xs text-[#342421]/75 leading-relaxed">
                If an account exists for <strong className="text-[#342421] font-mono">{email}</strong>, a secure password reset link has been dispatched.
              </p>

              <div className="p-3 bg-white rounded-2xl border border-[#342421]/20 text-[11px] text-[#342421]/70 font-medium">
                Tip: Check your spam or promotions tab if you don&apos;t see the message within 2 minutes.
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  href="/login"
                  className="w-full inline-flex justify-center items-center gap-2 py-3.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all text-center"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs font-bold text-[#342421]/70 hover:text-[#FF7836] transition block mx-auto underline mt-2"
                >
                  Send to a different email address
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@bakeconnect.com"
                    className="block w-full pl-10 pr-4 py-3 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all mt-6"
              >
                <span>{isLoading ? 'Sending Instructions...' : 'Send Recovery Link'}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="mt-6 pt-5 border-t-2 border-[#342421]/15 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#342421]/80 hover:text-[#FF7836] transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Remembered your password? Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer Nav */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-[#342421]/70 hover:text-[#FF7836] transition uppercase tracking-wider"
          >
            ← Return to Bakery Counter
          </Link>
        </div>
      </div>
    </div>
  );
}
