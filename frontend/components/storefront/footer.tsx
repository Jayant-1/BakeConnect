'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Mail, ShieldCheck, Heart, MapPin, PhoneCall, Clock, Store, FileText } from 'lucide-react';
import { useAuth } from '../../lib/store/auth-context';

export function Footer() {
  const { role } = useAuth();

  return (
    <footer className="bg-[#342421] text-[#FFF7EB] border-t-2 border-[#342421] pt-14 pb-10 mt-12 sm:mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-white/10">
          {/* Brand Info (Cols 1-5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-1.5 shadow-xs shrink-0 border border-[#342421]/20">
                <Image
                  src="/images/logo-icon.png"
                  alt="BakeConnect Emblem"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
                />
              </div>
              <span className="font-display text-2xl tracking-wide uppercase text-[#FFF7EB]">
                Bake<span className="text-[#FF7836]">Connect</span>
              </span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed max-w-sm">
              Pune&apos;s neighbourhood bakery. Soft morning ladi pav, pure butter khari, Irani mawa cakes, and celebration cakes baked fresh daily with honest ingredients and no artificial preservatives.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#FF7836] font-bold">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Shop 4, Lane 5, Koregaon Park, Pune, Maharashtra 411001</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <PhoneCall className="w-4 h-4 text-[#FF7836] shrink-0" />
              <span>Bakery Counter Hotline: +91 98200 98200 (6:00 AM – 10:30 PM)</span>
            </div>
          </div>

          {role === 'RETAILER' ? (
            <>
              {/* Wholesale Operations (Cols 6-8) */}
              <div className="lg:col-span-3 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  Wholesale Operations
                </h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>
                    <Link href="/retailer" className="hover:text-[#FF7836] transition-colors">
                      Order Stock &amp; Catalog
                    </Link>
                  </li>
                  <li>
                    <Link href="/retailer/orders" className="hover:text-[#FF7836] transition-colors">
                      Standing &amp; Bulk Orders
                    </Link>
                  </li>
                  <li>
                    <Link href="/retailer/invoices" className="hover:text-[#FF7836] transition-colors">
                      Invoices &amp; Statements
                    </Link>
                  </li>
                  <li>
                    <Link href="/help" className="hover:text-[#FF7836] transition-colors">
                      Commercial Partner Support
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Commercial Dispatch (Cols 9-12) */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  Commercial Route Dispatch
                </h4>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  Dedicated pre-dawn 5:30 AM delivery for Pune grocers, cafes, and chai points. Official GST tax invoices with Net-15 invoice credit.
                </p>
                <div className="space-y-1.5 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>100% Input Tax Credit Eligible (HSN Coded)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#FF7836] shrink-0" />
                    <span>Route Dispatch Hotline: +91 98200 98200</span>
                  </div>
                </div>
              </div>
            </>
          ) : role === 'DIRECT_CUSTOMER' ? (
            <>
              {/* Direct Customer Ordering (Cols 6-8) */}
              <div className="lg:col-span-3 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  Bakery Counter (Retail)
                </h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>
                    <Link href="/shop" className="hover:text-[#FF7836] transition-colors">
                      Today&apos;s Fresh Catalog
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=pav-breads" className="hover:text-[#FF7836] transition-colors">
                      Pav &amp; Heritage Breads
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=khari-rusk-biscuits" className="hover:text-[#FF7836] transition-colors">
                      Khari, Rusk &amp; Biscuits
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=celebration-cakes" className="hover:text-[#FF7836] transition-colors">
                      Celebration Cakes &amp; Pastries
                    </Link>
                  </li>
                  <li>
                    <Link href="/account/orders" className="hover:text-[#FF7836] transition-colors">
                      My Orders &amp; Receipts
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Bakery Craft & Hours (Cols 9-12) */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  Bakery Timings &amp; Hearth Craft
                </h4>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  Hearth-baked daily in Koregaon Park with cultured butter and desi ghee. Warm batches out of the oven every morning at 6:30 AM and 10:00 AM.
                </p>
                <div className="space-y-1.5 text-xs text-white/80">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#FF7836] shrink-0" />
                    <span>Counter Hours: 6:00 AM – 10:30 PM Daily</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 text-[#FF7836] shrink-0" />
                    <span>Pure Ingredients • No Artificial Additives</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Direct Customer Ordering (Cols 6-8) */}
              <div className="lg:col-span-3 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  Bakery Counter (Retail)
                </h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li>
                    <Link href="/shop" className="hover:text-[#FF7836] transition-colors">
                      Today&apos;s Fresh Catalog
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=pav-breads" className="hover:text-[#FF7836] transition-colors">
                      Pav &amp; Heritage Breads
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=khari-rusk-biscuits" className="hover:text-[#FF7836] transition-colors">
                      Khari, Rusk &amp; Biscuits
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?category=celebration-cakes" className="hover:text-[#FF7836] transition-colors">
                      Celebration Cakes &amp; Pastries
                    </Link>
                  </li>
                  <li>
                    <Link href="/account/orders" className="hover:text-[#FF7836] transition-colors">
                      My Orders &amp; Receipts
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Wholesale B2B Supply (Cols 9-12) */}
              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-xs uppercase tracking-wider font-bold text-[#FF7836]">
                  For Shops &amp; Cafes (Wholesale)
                </h4>
                <p className="text-xs text-white/70 leading-relaxed mb-3">
                  Direct pre-dawn delivery of fresh ladi pav, khari, and tea cakes across Pune with GST invoicing and Net-15 credit facilities.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <Link
                    href="/wholesale"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-bold bg-[#FF7836] text-[#342421] border border-[#342421] shadow-[2px_2px_0px_rgba(0,0,0,0.3)] hover:bg-[#FF6A1F] transition-all"
                  >
                    Wholesale Overview
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Register Shopkeeper
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-white/60 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span>© 2026 BakeConnect Bakery. Koregaon Park, Pune.</span>
            <span>•</span>
            <span>Authentic Pune Bakery Craft</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <Heart className="w-3.5 h-3.5 text-[#FF7836] fill-[#FF7836]" />
            <span>Hearth-Baked Daily with Cultured Butter & Desi Ghee</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

