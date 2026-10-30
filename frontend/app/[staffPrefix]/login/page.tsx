'use client';

import React, { useState, use } from 'react';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '../../../lib/store/auth-context';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';

export default function StaffLoginPage({
  params,
}: {
  params: Promise<{ staffPrefix: string }>;
}) {
  const resolvedParams = use(params);
  const staffPrefix = resolvedParams.staffPrefix;
  const configuredPrefix = process.env.NEXT_PUBLIC_STAFF_PREFIX || 'staff-mgmt-9a4c1f7b';

  if (staffPrefix !== configuredPrefix) {
    notFound();
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email.trim(), password);
      if (user.role !== 'BAKERY_ADMIN' && user.role !== 'BAKERY_MANAGER') {
        logout();
        setError('Access restricted to authorized bakery staff members only.');
        return;
      }

      if (redirectParam && redirectParam.startsWith(`/${staffPrefix}`)) {
        router.push(redirectParam);
      } else if (user.role === 'BAKERY_ADMIN') {
        router.push(`/${staffPrefix}/admin`);
      } else {
        router.push(`/${staffPrefix}/bakery-manager`);
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid staff credentials. Please check your email and password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#1F1715] text-[#FFF7EB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="relative w-12 h-12 rounded-2xl bg-[#FFF7EB] border-2 border-[#FF7836] p-1.5 shadow-[2px_2px_0px_#FF7836] flex items-center justify-center">
            <Image
              src="/images/logo-icon.png"
              alt="BakeConnect Staff Deck"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <span className="font-display text-2xl uppercase tracking-wider text-white leading-none block">
              Bake<span className="text-[#FF7836]">Connect</span>
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#FF7836] font-bold">
              Private Staff Workspace
            </span>
          </div>
        </div>
        <h1 className="font-display uppercase text-2xl font-bold tracking-tight text-white">
          Staff Authentication
        </h1>
        <p className="mt-1 text-xs text-white/60">
          Bakery Manager & Administrator Private Operations Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#2D211E] py-8 px-6 sm:px-10 rounded-3xl border-2 border-[#3E2F2B] shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500/50 flex items-start gap-3 text-rose-200 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5"
              >
                Staff Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="staff-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@bakeconnect.com"
                  className="block w-full pl-10 pr-4 py-3 border-2 border-white/20 rounded-2xl text-xs font-bold text-white placeholder:text-white/30 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-black/30"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-xs font-bold uppercase tracking-wider text-white/80 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="staff-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-11 py-3 border-2 border-white/20 rounded-2xl text-xs font-bold text-white placeholder:text-white/30 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836] bg-black/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/50 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider text-[#342421] bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#1E1412] shadow-[3px_3px_0px_#1E1412] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all mt-6"
            >
              <span>{isSubmitting ? 'Authenticating Staff...' : 'Sign In to Staff Workspace'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <span className="text-[11px] text-white/40 flex items-center justify-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#FF7836]" />
              Secure Staff Portal • Local Credentials Protected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
