'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Clock, ArrowRight, Truck } from 'lucide-react';
import { getBakeryBatch, BakeryBatch } from '../../lib/bakery-schedule';
import { useAuth } from '../../lib/store/auth-context';

export function AnnouncementBar() {
  const { role } = useAuth();
  const [batch, setBatch] = useState<BakeryBatch>(() => getBakeryBatch());

  useEffect(() => {
    // Sync with local client clock on mount
    setBatch(getBakeryBatch());

    // Update dynamically as time advances
    const timer = setInterval(() => {
      setBatch(getBakeryBatch());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#2D211B] text-[#FFF8EF] px-4 py-2 text-xs font-medium tracking-wide border-b border-[#3D2F27]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-center sm:text-left">
        {role === 'RETAILER' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="flex items-center gap-1.5 text-white/90">
                <Truck className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                <span>
                  <strong>Commercial Route Dispatch:</strong> Guaranteed 5:30 AM pre-dawn delivery across Pune • Net-15 Invoicing
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-white/70">Standing Orders Desk:</span>
              <Link
                href="/retailer"
                className="text-[#D4973B] hover:text-[#E6B86A] font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Shopkeeper Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        ) : role === 'DIRECT_CUSTOMER' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#D4973B] animate-pulse" />
              <span className="flex items-center gap-1.5 text-white/90">
                <Clock className="w-3.5 h-3.5 text-[#D4973B] inline shrink-0" />
                <span suppressHydrationWarning>
                  <strong>{batch.batchName}:</strong> Warm ladi pav, butter khari &amp; mawa cakes fresh out of oven by {batch.timeString}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-white/70">Koregaon Park Bakery Counter:</span>
              <Link
                href="/shop"
                className="text-[#D4973B] hover:text-[#E6B86A] font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Free Doorstep Delivery on Orders Over ₹500</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#D4973B] animate-pulse" />
              <span className="flex items-center gap-1.5 text-white/90">
                <Clock className="w-3.5 h-3.5 text-[#D4973B] inline shrink-0" />
                <span suppressHydrationWarning>
                  <strong>{batch.batchName}:</strong> Warm ladi pav, butter khari &amp; mawa cakes fresh out of oven by {batch.timeString}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-white/70">Supply for cafes, chai points & grocers:</span>
              <Link
                href="/wholesale"
                className="text-[#D4973B] hover:text-[#E6B86A] font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <span>Wholesale Supply for Shops</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
