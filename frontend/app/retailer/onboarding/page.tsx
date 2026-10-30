'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/store/auth-context';
import { backendClient } from '../../../lib/api/backend-client';
import { RetailerProfile } from '../../../lib/api/types-v2';
import {
  Building2,
  FileCheck,
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';

export default function RetailerOnboardingPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/retailer/onboarding');
      return;
    }

    if (user) {
      setContactPersonName(user.fullName || '');
      setContactPhone(user.phone || '');
    }

    async function loadExisting() {
      try {
        const prof = await backendClient.getMyProfile();
        if (prof) {
          setBusinessName(prof.businessName || '');
          setGstNumber(prof.gstNumber || '');
          setContactPersonName(prof.contactPersonName || '');
          setContactPhone(prof.contactPhone || '');
        }
      } catch {
        // First-time onboarding, no profile yet
      }
    }

    loadExisting();
  }, [isLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Submit retailer profile
      await backendClient.submitProfile({
        businessName,
        contactPersonName,
        contactPhone,
        gstNumber: gstNumber || undefined,
      });

      // 2. Submit delivery address if provided
      if (addressLine1 && city && postalCode) {
        await backendClient.createAddress({
          type: 'SHIPPING',
          contactName: contactPersonName,
          contactPhone,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          postalCode,
          isDefault: true,
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push('/retailer');
      }, 1500);
    } catch (err: any) {
      setError(
        err?.message || 'Failed to submit shop profile. Please verify your entries.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="bg-white rounded-2xl border border-[#E6DAC8] shadow-sm p-6 sm:p-10">
        {/* Header */}
        <div className="border-b border-[#E6DAC8] pb-6 mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-[#9C3D2B] uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            Wholesale Partner Setup
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#2D211B]">
            Shopkeeper Onboarding & Delivery Terms
          </h1>
          <p className="mt-2 text-sm text-[#7A685D]">
            Provide your bakery retail shop details, dispatch address, and GSTIN for wholesale invoicing and next-day route scheduling.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Shop details saved successfully! Redirecting to your wholesale order desk...
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Business Identity */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#2D211B] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#9C3D2B]" />
              Shop & Business Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Shop / Cafe Name *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Chai Point Indiranagar"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="29AABCU9603R1ZM"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7] font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  placeholder="Suresh Kumar"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Delivery Destination */}
          <div className="space-y-4 pt-6 border-t border-[#E6DAC8]">
            <h2 className="text-base font-bold text-[#2D211B] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#9C3D2B]" />
              Morning Wholesale Delivery Address
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                Shop Street Address / Building *
              </label>
              <input
                type="text"
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Shop #4, 12th Main Road, HAL 2nd Stage"
                className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                Landmark / Area (Optional)
              </label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Near Metro Pillar #124"
                className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Bengaluru"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  State *
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6A4B35]">
                  Pincode *
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="560038"
                  className="mt-1 block w-full px-3 py-2.5 border border-[#D5C7B4] rounded-xl text-sm focus:ring-2 focus:ring-[#9C3D2B] bg-[#FDFBF7]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm font-semibold text-white bg-[#9C3D2B] hover:bg-[#7A2C1D] shadow-sm disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Saving Profile...' : 'Save & Access Wholesale Desk'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
