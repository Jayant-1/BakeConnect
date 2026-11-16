'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Menu,
  X,
  ChevronDown,
  Receipt,
  User,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { NetflixAvatar } from '../../components/layout/storefront-header';

export default function RetailerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAuthenticated, isLoading, logout } = useAuth();
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

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

  // Handle outside click and Escape key for account dropdown & mobile menu
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAccountMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  // Close menus on path navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  // Only the 3 primary daily workflow actions for retailers on the navbar
  const navLinks = [
    { label: 'Order Stock', href: '/retailer' },
    { label: 'My Orders', href: '/retailer/orders' },
    { label: 'Invoices & Ledger', href: '/retailer/invoices' },
  ];

  const outstandingAmount = billing?.totalOutstandingBalance ?? billing?.totalOutstanding ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7EB] text-[#342421]">
      {/* Top Wholesale Operational Bar */}
      <div className="bg-[#342421] text-[#FFF7EB] px-4 sm:px-6 lg:px-8 py-2 text-xs flex items-center justify-between gap-3 border-b-2 border-[#342421]">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[11px] uppercase tracking-wider text-[#FF7836]">
            Wholesale Desk
          </span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline text-[#FFF7EB]/80 font-medium">
            Morning dispatch cut-off: 9:00 PM for next-day 5:30 AM delivery
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/90">
          <a
            href="tel:+919876543210"
            className="flex items-center gap-1.5 font-bold hover:text-[#FF7836] transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#FF7836]" />
            <span className="hidden sm:inline">Dispatch Desk:</span>
            <span>+91 98765 43210</span>
          </a>
        </div>
      </div>

      {/* Main Retailer Header (Clean & Simple 12-Column Grid like Customer Header) */}
      <header className="bg-[#FFF7EB]/95 backdrop-blur-md border-b-2 border-[#342421] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-12 items-center h-20">
            {/* 1. Left: Brand Emblem & Title (Col 1-3) */}
            <div className="col-span-8 lg:col-span-3 flex items-center">
              <Link href="/retailer" className="flex items-center gap-3 group">
                <div className="relative w-11 h-11 flex-shrink-0 group-hover:scale-105 transition-transform bg-white rounded-2xl border-2 border-[#342421] p-1 shadow-[2px_2px_0px_#342421] flex items-center justify-center">
                  <Image
                    src="/images/logo-icon.png"
                    alt="BakeConnect Emblem"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl tracking-tight text-[#342421] leading-none">
                    Bake<span className="text-[#FF7836]">Connect</span>
                  </span>
                  <span className="text-[10px] bg-[#D9EAF3] text-[#342421] font-black border border-[#342421]/60 px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#342421] uppercase tracking-wider">
                    SHOPS
                  </span>
                </div>
              </Link>
            </div>

            {/* 2. Center: Clean & Uncrowded Navigation Links (Col 4-9) */}
            <nav className="hidden lg:flex col-span-6 justify-center items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#342421]">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors py-1 ${
                      isActive
                        ? 'text-[#FF7836] border-b-2 border-[#FF7836]'
                        : 'hover:text-[#FF7836]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* 3. Right: User Profile & Mobile Controls (Col 10-12) */}
            <div className="col-span-4 lg:col-span-3 flex items-center justify-end gap-3">
              {/* Authenticated Retailer Avatar & Dropdown (Contains Account Details & Tools) */}
              <div className="relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/70 transition-all focus:outline-hidden focus:ring-2 focus:ring-[#342421]"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  aria-label="Merchant profile and account menu"
                >
                  <NetflixAvatar
                    seed={user?.email || profile?.businessName || 'retailer'}
                    className="w-8 h-8 hover:scale-105 transition-transform"
                  />
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#342421]/80 transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu - ONLY items NOT already on navbar */}
                {accountMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-[#FFF7EB] border-2 border-[#342421] rounded-2xl shadow-[4px_4px_0px_#342421] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3"
                    role="menu"
                  >
                    {/* Merchant Shop Identity */}
                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border-2 border-[#342421]/15">
                      <NetflixAvatar
                        seed={user?.email || profile?.businessName || 'retailer'}
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#342421] truncate">
                          {profile?.businessName || user?.fullName || 'Shopkeeper Desk'}
                        </p>
                        <p className="text-[11px] text-[#342421]/60 truncate font-medium">
                          {user?.email}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {profile?.approvalStatus === 'APPROVED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#EBF7EE] text-[#1E562A] border border-[#1E562A]/40">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-900/40">
                              <AlertCircle className="w-2.5 h-2.5" /> Pending
                            </span>
                          )}
                          <span className="text-[9px] font-mono font-bold text-[#342421]/70">
                            {profile?.paymentTerms || 'NET 15'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Outstanding Dues quick glance */}
                    <div className="p-2.5 bg-white/80 rounded-xl border border-[#342421]/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#FF7836]" />
                        <span className="text-xs font-bold text-[#342421]">Outstanding Dues</span>
                      </div>
                      <span className="text-xs font-black font-mono text-[#342421]">
                        {formatCurrency(outstandingAmount)}
                      </span>
                    </div>

                    {/* Dropdown Items (ONLY things not on the navbar) */}
                    <div className="py-1 space-y-1">
                      <Link
                        href="/retailer/onboarding"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                        role="menuitem"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#342421]" />
                        <span>Shop Profile & Documents</span>
                      </Link>
                      <Link
                        href="/shop"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                        role="menuitem"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#FF7836]" />
                        <span>Switch to Retail Counter</span>
                      </Link>
                    </div>

                    {/* Sign out */}
                    <div className="pt-2 border-t border-[#342421]/15">
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="lg:hidden p-2 rounded-xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-[#342421] hover:bg-[#FFF7EB] transition-colors"
                aria-label="Toggle navigation drawer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t-2 border-[#342421] bg-[#FFF7EB] p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
            {profile && (
              <div className="p-3 bg-white rounded-xl border-2 border-[#342421] shadow-[2px_2px_0px_#342421] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#342421] truncate">{profile.businessName}</span>
                  {profile.approvalStatus === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EBF7EE] text-[#1E562A] border border-[#1E562A]/40">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-900/40">
                      <AlertCircle className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#342421]/70">
                  <span>GST: {profile.gstNumber || 'Unregistered'}</span>
                  <span>Terms: {profile.paymentTerms || 'NET 15'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#342421]/15 text-xs">
                  <span className="font-medium text-[#342421]/80">Outstanding Dues</span>
                  <span className="font-black font-mono text-[#342421]">
                    {formatCurrency(outstandingAmount)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-[#342421] transition-all ${
                      isActive
                        ? 'bg-[#FF7836] text-[#342421] shadow-[2px_2px_0px_#342421]'
                        : 'bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB]'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/retailer/onboarding"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-[#342421] bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB]"
              >
                Shop Profile & Documents
              </Link>
            </div>

            <div className="pt-2 border-t-2 border-[#342421]/20 flex items-center justify-between">
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#342421] hover:text-[#FF7836]"
              >
                <ShoppingBag className="w-4 h-4 text-[#FF7836]" />
                <span>Visit Retail Counter</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Verification Warning Alert if status is PENDING_APPROVAL */}
      {profile && profile.approvalStatus === 'PENDING_APPROVAL' && (
        <div className="bg-[#FFF2D6] border-b-2 border-[#342421] px-4 py-3 text-[#342421]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-400 border border-[#342421] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#342421]">
                <AlertCircle className="w-4 h-4 text-[#342421]" />
              </div>
              <span className="text-xs font-medium">
                <strong className="font-bold">Shopkeeper verification in progress:</strong> Your business documents and credit terms are being reviewed by the bakery dispatch team. Wholesale orders will unlock immediately upon verification.
              </span>
            </div>
            <Link
              href="/retailer/onboarding"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FF7836] text-[#342421] font-black text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421] hover:bg-[#ff8a4f] transition-all whitespace-nowrap"
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
      <footer className="bg-[#342421] text-[#FFF7EB] border-t-2 border-[#342421] py-8 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-display text-sm tracking-wide text-[#FFF7EB]">
              Bake<span className="text-[#FF7836]">Connect</span>
            </span>
            <span className="text-white/40">•</span>
            <span className="text-[#FFF7EB]/80 font-medium">Wholesale Merchant Desk</span>
            <span className="text-white/40">•</span>
            <span className="text-[#FFF7EB]/60">Artisanal Pune Bakery Supply</span>
          </div>
          <div className="text-[#FFF7EB]/80">
            Urgent morning delivery adjustments? Call dispatch floor at{' '}
            <a href="tel:+919876543210" className="font-bold text-[#FF7836] hover:underline">
              +91 98765 43210
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
