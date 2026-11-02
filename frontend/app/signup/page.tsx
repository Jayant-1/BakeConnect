'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../lib/store/auth-context';
import { UserRole } from '../../lib/api/types-v2';
import {
  User,
  Store,
  Mail,
  Lock,
  Phone,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const { register, getRedirectForRole } = useAuth();

  const [role, setRole] = useState<UserRole>('DIRECT_CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleParam === 'RETAILER') {
      setRole('RETAILER');
    } else if (roleParam === 'DIRECT_CUSTOMER') {
      setRole('DIRECT_CUSTOMER');
    }
  }, [roleParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const createdUser = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role,
      });

      if (role === 'RETAILER') {
        router.push('/retailer/onboarding');
      } else {
        router.push(getRedirectForRole(createdUser.role));
      }
    } catch (err: any) {
      setError(
        err?.message || 'Failed to create your account. Please check your details and try again.'
      );
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
          CREATE YOUR ACCOUNT
        </h1>
        <p className="mt-1 text-xs text-[#342421]/70 font-medium">
          Fresh morning bakes delivered to your door or bulk wholesale crates for your shop
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-[#FFF7EB] py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421]">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-3 text-rose-900 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Role Chooser */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-2.5">
              Account Type:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('DIRECT_CUSTOMER')}
                className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                  role === 'DIRECT_CUSTOMER'
                    ? 'border-[#342421] bg-white shadow-[3px_3px_0px_#342421]'
                    : 'border-[#342421]/20 bg-white/60 hover:bg-white text-[#342421]/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                      role === 'DIRECT_CUSTOMER'
                        ? 'bg-[#FFF7EB] border-[#342421] text-[#FF7836]'
                        : 'bg-stone-100 border-stone-200 text-stone-500'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  {role === 'DIRECT_CUSTOMER' && (
                    <span className="text-[10px] font-bold text-white bg-[#FF7836] px-2 py-0.5 rounded-full border border-[#342421]">
                      Active
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="text-xs font-bold text-[#342421]">Bakery Customer</div>
                  <div className="text-[11px] text-[#342421]/60 mt-0.5 leading-snug">
                    Morning pav, mawa cakes & artisan bakes for home.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('RETAILER')}
                className={`p-3.5 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                  role === 'RETAILER'
                    ? 'border-[#342421] bg-white shadow-[3px_3px_0px_#342421]'
                    : 'border-[#342421]/20 bg-white/60 hover:bg-white text-[#342421]/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                      role === 'RETAILER'
                        ? 'bg-[#D9EAF3] border-[#342421] text-[#1D5C96]'
                        : 'bg-stone-100 border-stone-200 text-stone-500'
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                  {role === 'RETAILER' && (
                    <span className="text-[10px] font-bold text-white bg-[#1D5C96] px-2 py-0.5 rounded-full border border-[#342421]">
                      Wholesale
                    </span>
                  )}
                </div>
                <div className="mt-2.5">
                  <div className="text-xs font-bold text-[#342421]">Shop / Wholesale</div>
                  <div className="text-[11px] text-[#342421]/60 mt-0.5 leading-snug">
                    For cafes, tea stalls & kiranas buying bulk crates.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="block w-full pl-10 pr-4 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
                >
                  Phone Number {role === 'RETAILER' ? '*' : '(Optional)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required={role === 'RETAILER'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98203 98201"
                    className="block w-full pl-10 pr-4 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
                  />
                </div>
              </div>
            </div>

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
                  placeholder="e.g. vikram@example.com"
                  className="block w-full pl-10 pr-4 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
                />
              </div>
            </div>

            {role === 'RETAILER' && (
              <div className="p-4 bg-[#D9EAF3]/40 rounded-2xl border-2 border-[#342421] space-y-3 shadow-[2px_2px_0px_#342421]">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#1D5C96] flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Wholesale Shop Details
                </div>

                <div>
                  <label
                    htmlFor="businessName"
                    className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
                  >
                    Shop / Cafe Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                      <Building className="h-4 w-4" />
                    </div>
                    <input
                      id="businessName"
                      name="businessName"
                      type="text"
                      required={role === 'RETAILER'}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Irani Chai & Cafe FC Road"
                      className="block w-full pl-10 pr-4 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="gstNumber"
                    className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
                  >
                    GSTIN Number (Optional)
                  </label>
                  <input
                    id="gstNumber"
                    name="gstNumber"
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="block w-full px-3.5 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white uppercase font-mono tracking-wider"
                  />
                  <p className="mt-1 text-[10px] text-[#342421]/60 font-medium">
                    Enables ITC input tax credit invoices on wholesale bakery deliveries.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#342421]/50">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full pl-10 pr-11 py-2.5 border-2 border-[#342421] rounded-2xl text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-white shadow-[2px_2px_0px_#342421]"
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
              <span>
                {isSubmitting
                  ? 'Creating Account...'
                  : role === 'RETAILER'
                  ? 'Register Shop & Continue'
                  : 'Create Customer Account'}
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Sign In Bridge */}
          <div className="mt-6 pt-5 border-t-2 border-[#342421]/15 text-center">
            <p className="text-xs text-[#342421]/70 font-semibold">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-[#FF7836] hover:underline ml-1"
              >
                Sign in here
              </Link>
            </p>
          </div>
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFF7EB] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#FF7836] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
