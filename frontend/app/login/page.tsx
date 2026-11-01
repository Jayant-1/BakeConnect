'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/store/auth-context';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles, Check } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const messageParam = searchParams.get('message');
  const { login, getRedirectForRole } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filledRole, setFilledRole] = useState<string | null>(null);

  const handleQuickFill = (quickEmail: string, quickPass: string, roleName: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
    setFilledRole(roleName);
    setTimeout(() => {
      setFilledRole(null);
    }, 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email.trim(), password);
      const destination = redirectParam || getRedirectForRole(loggedInUser.role);
      router.push(destination);
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
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
          WELCOME BACK
        </h1>
        <p className="mt-1 text-xs text-[#342421]/70 font-medium">
          Sign in to your customer or shopkeeper wholesale account
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#FFF7EB] py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421]">
          {/* Informational Prompt (e.g. from redirect) */}
          {messageParam && !error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] shadow-[2px_2px_0px_#342421]">
              {messageParam}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3 text-rose-900 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Minimal Quick Login Bar */}
          <div className="mb-6 flex items-center justify-between p-2.5 px-3.5 rounded-2xl bg-white border border-[#342421]/20 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#342421]/70 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF7836]" />
                Quick Login:
              </span>
              {filledRole && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ {filledRole} filled
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('customer1@bakeconnect.com', 'Password@123', 'Customer')}
                className="px-3 py-1 rounded-xl text-[11px] font-bold text-[#342421] bg-[#FFF7EB] hover:bg-[#FF7836] hover:text-white border border-[#342421]/20 transition-all active:scale-95"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('retailer1@bakeconnect.com', 'Password@123', 'Shopkeeper')}
                className="px-3 py-1 rounded-xl text-[11px] font-bold text-[#342421] bg-[#D9EAF3] hover:bg-[#342421] hover:text-white border border-[#342421]/20 transition-all active:scale-95"
              >
                Shopkeeper
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
              >
                Email Address
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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold uppercase tracking-wider text-[#342421]"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#FF7836] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-3 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#342421]/60 hover:text-[#342421]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider text-white bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all mt-6"
            >
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to BakeConnect'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Registration Options */}
          <div className="mt-8 pt-6 border-t-2 border-[#342421]/15 text-center space-y-3">
            <p className="text-xs text-[#342421]/70 font-semibold">
              Don&apos;t have an account yet?
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/signup?role=DIRECT_CUSTOMER"
                className="flex-1 py-2.5 px-3 rounded-full text-xs font-bold text-[#342421] bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#FDF4E3] transition-all text-center"
              >
                Customer Sign Up
              </Link>
              <Link
                href="/signup?role=RETAILER"
                className="flex-1 py-2.5 px-3 rounded-full text-xs font-bold text-[#342421] bg-[#D9EAF3] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#C9E0ED] transition-all text-center"
              >
                Wholesale Shopkeeper
              </Link>
            </div>
          </div>
        </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF7EB] flex items-center justify-center font-bold text-xs uppercase text-[#342421]">Loading login portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
