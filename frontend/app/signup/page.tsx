'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { register, getRedirectForRole } = useAuth();

  const [role, setRole] = useState<UserRole>('DIRECT_CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const createdUser = await register({
        fullName,
        email,
        password,
        phone: phone || undefined,
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
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#FFF8EF]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block group mb-3">
          <Image
            src="/images/logo.png"
            alt="BakeConnect"
            width={180}
            height={110}
            className="mx-auto h-20 w-auto object-contain group-hover:scale-105 transition-transform"
            priority
          />
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#2D211B] font-serif">
          Create your bakery account
        </h2>
        <p className="mt-2 text-sm text-[#7A685D]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[#9C3D2B] hover:text-[#7A2C1D] underline"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-xl shadow-stone-200/60 sm:rounded-2xl sm:px-10 border border-[#E6DAC8]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Role Chooser */}
          <div className="mb-8">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35] mb-3">
              I am creating an account as:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('DIRECT_CUSTOMER')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                  role === 'DIRECT_CUSTOMER'
                    ? 'border-[#9C3D2B] bg-[#9C3D2B]/5 ring-2 ring-[#9C3D2B]'
                    : 'border-[#D5C7B4] hover:border-[#6A4B35] bg-[#FDFBF7]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <User className={`w-5 h-5 ${role === 'DIRECT_CUSTOMER' ? 'text-[#9C3D2B]' : 'text-[#7A685D]'}`} />
                  {role === 'DIRECT_CUSTOMER' && (
                    <CheckCircle2 className="w-4 h-4 text-[#9C3D2B]" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-[#2D211B]">Bakery Customer</div>
                  <div className="text-xs text-[#7A685D] mt-0.5">
                    For morning pav, fresh cakes, pastries, and family celebrations (qty 1+).
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('RETAILER')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                  role === 'RETAILER'
                    ? 'border-[#9C3D2B] bg-[#9C3D2B]/5 ring-2 ring-[#9C3D2B]'
                    : 'border-[#D5C7B4] hover:border-[#6A4B35] bg-[#FDFBF7]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Store className={`w-5 h-5 ${role === 'RETAILER' ? 'text-[#9C3D2B]' : 'text-[#7A685D]'}`} />
                  {role === 'RETAILER' && (
                    <CheckCircle2 className="w-4 h-4 text-[#9C3D2B]" />
                  )}
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-[#2D211B]">Shopkeeper / Wholesale</div>
                  <div className="text-xs text-[#7A685D] mt-0.5">
                    For cafes, tea stalls, and grocers buying daily bulk crates at wholesale pricing.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A19183]">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Vikram Malhotra"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] focus:border-[#9C3D2B] bg-[#FDFBF7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A19183]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required={role === 'RETAILER'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] focus:border-[#9C3D2B] bg-[#FDFBF7]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                Email Address
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
                  placeholder="vikram@example.com"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] focus:border-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>
            </div>

            {role === 'RETAILER' && (
              <div className="p-4 bg-[#FAF5EE] rounded-xl border border-[#E6DAC8] space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9C3D2B] flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  Shop Details
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                    Shop / Cafe Name *
                  </label>
                  <div className="mt-1 relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A19183]">
                      <Building className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required={role === 'RETAILER'}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Chai Point Indiranagar"
                      className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] bg-white uppercase font-mono"
                  />
                  <p className="mt-1 text-[11px] text-[#8C7A6B]">
                    GST invoice enables ITC credit claim on wholesale bakery purchases.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                Password
              </label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A19183]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="block w-full pl-10 pr-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm placeholder-[#A19183] focus:ring-2 focus:ring-[#9C3D2B] focus:border-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-xs text-sm font-semibold text-white bg-[#9C3D2B] hover:bg-[#7A2C1D] focus:ring-2 focus:ring-[#9C3D2B] disabled:opacity-50 transition mt-6"
            >
              {isSubmitting
                ? 'Creating account...'
                : role === 'RETAILER'
                ? 'Register Shop & Continue'
                : 'Create Customer Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-[#7A685D] hover:text-[#2D211B] transition underline"
          >
            ← Back to BakeConnect Bakery Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
