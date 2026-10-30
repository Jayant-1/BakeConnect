'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/store/auth-context';
import { StorefrontLayout } from '../../components/layout/storefront-layout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Store,
  Truck,
  ShieldCheck,
  Award,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Building,
  FileText,
  Mail,
  PhoneCall,
  Coffee,
} from 'lucide-react';

export default function WholesalePage() {
  const router = useRouter();
  const { role, isLoading } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (role === 'DIRECT_CUSTOMER') {
        router.push('/shop');
      } else if (role === 'RETAILER') {
        router.push('/retailer');
      }
    }
  }, [role, isLoading, router]);

  if (!isLoading && (role === 'DIRECT_CUSTOMER' || role === 'RETAILER')) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <StorefrontLayout>
      <div className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs uppercase tracking-wider font-bold">
            <Store className="w-3.5 h-3.5" />
            <span>Wholesale Supply & B2B Distribution • Pune</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-[#342421] uppercase leading-none">
            DAILY BAKERY SUPPLY FOR <span className="text-[#FF7836]">CAFES, CHAI POINTS & GROCERS</span>.
          </h1>

          <p className="text-base text-[#342421]/75 leading-relaxed max-w-2xl mx-auto">
            Stock your shop with fresh morning ladi pav, pure butter khari, saunf rusks, and Irani mawa cakes. Guaranteed pre-dawn 5:30 AM delivery across Pune, wholesale net rates, and flexible Net-15 credit facilities.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <span>Register Shopkeeper Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/retailer">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-[#FFF7EB] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                <span>Existing Partner Portal</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFF7EB] rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#342421] text-[#FF7836] flex items-center justify-center shadow-[2px_2px_0px_#342421]">
              <Truck className="w-6 h-6 text-[#FF7836]" />
            </div>
            <h3 className="font-display text-xl uppercase tracking-wide text-[#342421]">
              PRE-DAWN 5:30 AM ROUTE DELIVERY
            </h3>
            <p className="text-xs text-[#342421]/75 leading-relaxed">
              Our dedicated delivery vans hit Pune roads by 4:45 AM. Your crates of soft ladi pav and tea accompaniments arrive well before your first morning customer orders chai.
            </p>
          </div>

          <div className="bg-[#D9EAF3] rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#342421] text-[#342421] flex items-center justify-center shadow-[2px_2px_0px_#342421]">
              <ShieldCheck className="w-6 h-6 text-[#342421]" />
            </div>
            <h3 className="font-display text-xl uppercase tracking-wide text-[#342421]">
              REVOLVING NET-15 CREDIT TERMS
            </h3>
            <p className="text-xs text-[#342421]/75 leading-relaxed">
              Verified retail partners access convenient Net-3 and Net-15 settlement cycles. Order daily stock without constant micro-payments and settle on automated weekly statements.
            </p>
          </div>

          <div className="bg-[#FFF7EB] rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#342421] text-emerald-700 flex items-center justify-center shadow-[2px_2px_0px_#342421]">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-display text-xl uppercase tracking-wide text-[#342421]">
              FULL GST INPUT TAX CREDIT
            </h3>
            <p className="text-xs text-[#342421]/75 leading-relaxed">
              Every wholesale delivery comes with an official tax invoice showing HSN codes and exact GST breakdown, enabling your business to claim 100% legitimate input credit.
            </p>
          </div>
        </div>

        {/* Quick Inquiry Form */}
        <div id="onboard" className="bg-[#FFF7EB] rounded-3xl p-8 sm:p-12 border-2 border-[#342421] max-w-3xl mx-auto shadow-[6px_6px_0px_#342421]">
          <div className="text-center space-y-2 mb-8">
            <h2 className="font-display text-3xl uppercase font-bold text-[#342421]">
              APPLY FOR WHOLESALE ROUTE SUPPLY
            </h2>
            <p className="text-xs text-[#342421]/70 max-w-md mx-auto">
              Tell us about your shop or cafe in Pune. Our bakery dispatch manager will contact you within 2 hours to confirm your route slot.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 text-center bg-white rounded-3xl border-2 border-emerald-600 shadow-[3px_3px_0px_#342421] space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-display text-xl uppercase font-bold text-[#342421]">Application Received!</h3>
              <p className="text-xs text-[#342421]/75 max-w-sm mx-auto">
                Thank you, <strong>{businessName}</strong>. Our morning dispatch desk has received your request and will reach out to schedule your sample crate in Pune.
              </p>
              <div className="pt-2">
                <Link href="/signup">
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421]"
                  >
                    Complete Full Registration Now →
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block mb-1">
                    Shop / Cafe Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Pune Chai Tapri & Bakery"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98200 00000"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block mb-1">
                    15-Digit GSTIN (Maharashtra 27...)
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCU9603R1ZM"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-mono uppercase text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="orders@yourshop.in"
                    className="w-full px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full justify-center bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider py-4 rounded-full border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all mt-2"
              >
                Submit Wholesale Application
              </button>
            </form>
          )}
        </div>
      </div>
    </StorefrontLayout>
  );
}
