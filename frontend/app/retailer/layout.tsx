'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/store/auth-context';
import { backendClient } from '../../lib/api/backend-client';
import { RetailerProfile, BillingSummary } from '../../lib/api/types-v2';
import {
  Store,
  FileText,
  Clock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  PhoneCall,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export default function RetailerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isLoading && isAuthenticated && role === 'DIRECT_CUSTOMER') {
      router.push('/shop');
      return;
    }

    async function loadRetailerData() {
      try {
        const [prof, bill] = await Promise.allSettled([
          backendClient.getMyProfile(),
          backendClient.getBillingSummary(),
        ]);
        if (prof.status === 'fulfilled') setProfile(prof.value);
        if (bill.status === 'fulfilled') setBilling(bill.value);
      } catch (err) {
        console.warn('Could not load retailer workspace profile:', err);
      } finally {
        setLoadingData(false);
      }
    }

    if (isAuthenticated) {
      loadRetailerData();
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  const navLinks = [
    { label: 'Catalog & Bulk Order', href: '/retailer', icon: Store },
    { label: 'Wholesale Orders', href: '/retailer/orders', icon: Package },
    { label: 'Invoices & Ledger', href: '/retailer/invoices', icon: FileText },
    { label: 'Complete Shop Profile', href: '/retailer/onboarding', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#2D211B]">
      {/* Top Wholesale Operational Bar */}
      <div className="bg-[#2D211B] text-[#FFF8EF] px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-[#3D2F27]">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-wide uppercase text-[#D4973B]">
            BakeConnect Wholesale Partner Portal
          </span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline text-white/80">
            Morning dispatch cut-off: 9:00 PM for next-day 5:30 AM delivery
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/90">
          <a
            href="tel:+919876543210"
            className="flex items-center gap-1.5 hover:text-[#D4973B] transition"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#D4973B]" />
            <span>Dispatch Desk: +91 98765 43210</span>
          </a>
        </div>
      </div>

      {/* Main Retailer Header */}
      <header className="bg-white border-b border-[#E6DAC8] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand & Shop identity */}
          <div className="flex items-center gap-4">
            <Link href="/retailer" className="flex items-center gap-2.5 group">
              <Image
                src="/images/logo-icon.png"
                alt="BakeConnect Emblem"
                width={32}
                height={32}
                className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="font-serif text-2xl font-bold tracking-tight text-[#82461D]">
                Bake<span className="text-[#4EA72E]">Connect</span>
              </span>
              <span className="text-xs bg-[#4EA72E]/15 text-[#2E6B1B] font-bold px-2 py-0.5 rounded font-mono">
                SHOPS
              </span>
            </Link>

            {/* Shop Verified Pill */}
            {profile && (
              <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#E6DAC8]">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[#2D211B]">
                      {profile.businessName}
                    </span>
                    {profile.approvalStatus === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Verification Pending
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#7A685D]">
                    GSTIN: {profile.gstNumber || 'Unregistered'} • Terms: {profile.paymentTerms}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#9C3D2B] text-white shadow-sm'
                      : 'text-[#6A4B35] hover:bg-[#F4E8D6]/60 hover:text-[#2D211B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Financial summary & user actions */}
          <div className="flex items-center gap-3">
            {/* Outstanding dues pill */}
            <Link
              href="/retailer/invoices"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF5EE] border border-[#E6DAC8] hover:border-[#D4973B] transition"
              title="Click to view wholesale invoices"
            >
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase font-semibold text-[#8C7A6B]">
                  Outstanding Dues
                </span>
                <span className="text-sm font-bold text-[#9C3D2B]">
                  {formatCurrency(billing?.totalOutstanding ?? profile?.availableCredit ? 0 : 0)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8C7A6B]" />
            </Link>

            {/* Logout button */}
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[#7A685D] hover:text-[#9C3D2B] hover:bg-red-50 transition border border-transparent hover:border-red-200"
              title="Sign out of Shopkeeper Portal"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Verification Warning Alert if status is PENDING_APPROVAL */}
      {profile && profile.approvalStatus === 'PENDING_APPROVAL' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-amber-900 text-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Shopkeeper verification in progress:</strong> Your business documents and credit terms are being reviewed by the bakery team. Wholesale orders will unlock immediately upon verification.
              </span>
            </div>
            <Link
              href="/retailer/onboarding"
              className="text-amber-800 underline font-semibold text-xs whitespace-nowrap hover:text-amber-950"
            >
              Review Shop Details →
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Retailer Workspace Footer */}
      <footer className="bg-white border-t border-[#E6DAC8] py-6 text-xs text-[#7A685D] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#2D211B]">BakeConnect Wholesale Distribution</span>
            <span>•</span>
            <span>Authentic Indian Bakery Supply Network</span>
          </div>
          <div>
            Need urgent morning stock changes? Call bakery floor at <a href="tel:+919876543210" className="font-semibold text-[#9C3D2B]">+91 98765 43210</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
