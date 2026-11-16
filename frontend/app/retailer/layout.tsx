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

  const navLinks = [
    { label: 'Catalog & Bulk Order', href: '/retailer', icon: Store },
    { label: 'Wholesale Orders', href: '/retailer/orders', icon: Package },
    { label: 'Invoices & Ledger', href: '/retailer/invoices', icon: FileText },
    { label: 'Complete Shop Profile', href: '/retailer/onboarding', icon: ShieldCheck },
  ];

  const outstandingAmount = billing?.totalOutstandingBalance ?? billing?.totalOutstanding ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF7EB] text-[#342421]">
      {/* Top Wholesale Operational Bar */}
      <div className="bg-[#342421] text-[#FFF7EB] px-4 sm:px-6 lg:px-8 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#342421]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FF7836]/20 text-[#FF7836] border border-[#FF7836]/40 font-black uppercase text-[10px] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7836] animate-pulse" />
            Wholesale Terminal
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
            <span>Dispatch Desk: +91 98765 43210</span>
          </a>
        </div>
      </div>

      {/* Main Retailer Header */}
      <header className="bg-[#FFF7EB]/95 backdrop-blur-md border-b-2 border-[#342421] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand & Shop Identity */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/retailer" className="flex items-center gap-3 group shrink-0">
              <div className="relative w-11 h-11 shrink-0 group-hover:scale-105 transition-transform bg-white rounded-2xl border-2 border-[#342421] p-1 shadow-[2px_2px_0px_#342421] flex items-center justify-center">
                <Image
                  src="/images/logo-icon.png"
                  alt="BakeConnect Emblem"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl tracking-tight text-[#342421] leading-none">
                    Bake<span className="text-[#FF7836]">Connect</span>
                  </span>
                  <span className="text-[10px] bg-[#D9EAF3] text-[#342421] font-black border border-[#342421]/60 px-2 py-0.5 rounded-full shadow-[1px_1px_0px_#342421] uppercase tracking-wider">
                    SHOPS
                  </span>
                </div>
              </div>
            </Link>

            {/* Shop Verified Pill */}
            {profile && (
              <div className="hidden xl:flex items-center gap-3 pl-4 border-l-2 border-[#342421]/20 py-1 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#342421]/30 flex items-center justify-center text-[#342421] shadow-[1px_1px_0px_#342421] shrink-0">
                  <Store className="w-4 h-4 text-[#FF7836]" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#342421] truncate max-w-[170px]" title={profile.businessName}>
                      {profile.businessName}
                    </span>
                    {profile.approvalStatus === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EBF7EE] text-[#1E562A] border border-[#1E562A]/40 shadow-[1px_1px_0px_#1E562A]">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-900/40 shadow-[1px_1px_0px_#78350f]">
                        <AlertCircle className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-medium text-[#342421]/70 truncate">
                    GST: {profile.gstNumber || 'Unregistered'} • Terms: {profile.paymentTerms || 'NET 15'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links - Segmented Pill Bar */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/70 p-1.5 rounded-full border-2 border-[#342421] shadow-[2px_2px_0px_#342421]">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421]'
                      : 'text-[#342421]/80 hover:text-[#342421] hover:bg-white border-2 border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Financial summary & user actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Outstanding dues pill (visible on tablet and desktop) */}
            <Link
              href="/retailer/invoices"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#FFF7EB] transition-colors"
              title="Click to view wholesale invoices & dues"
            >
              <div className="w-7 h-7 rounded-lg bg-[#FF7836]/15 border border-[#342421]/20 flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-[#342421]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-black tracking-widest text-[#342421]/60 leading-tight">
                  Outstanding
                </span>
                <span className="text-xs font-black font-mono text-[#342421] leading-tight">
                  {formatCurrency(outstandingAmount)}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#342421]/50 ml-0.5" />
            </Link>

            {/* Storefront switch */}
            <Link
              href="/shop"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#342421] border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421] text-xs font-bold uppercase tracking-wider hover:bg-[#FFF7EB] transition-colors"
              title="View Direct Retail Counter"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#FF7836]" />
              <span>Retail Counter</span>
            </Link>

            {/* User Account / Netflix Avatar & Dropdown */}
            <div className="relative" ref={accountDropdownRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 p-1 rounded-xl hover:bg-white/70 transition-all focus:outline-hidden focus:ring-2 focus:ring-[#342421]"
                aria-expanded={accountMenuOpen}
                aria-haspopup="true"
                aria-label="Merchant profile and account menu"
              >
                <NetflixAvatar
                  seed={user?.email || profile?.businessName || 'retailer'}
                  className="w-9 h-9 hover:scale-105 transition-transform"
                />
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#342421]/80 transition-transform duration-200 ${
                    accountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 bg-[#FFF7EB] border-2 border-[#342421] rounded-2xl shadow-[4px_4px_0px_#342421] p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                >
                  {/* User Card */}
                  <div className="flex items-center gap-3 p-2 bg-white/90 rounded-xl border-2 border-[#342421]/15 mb-2">
                    <NetflixAvatar
                      seed={user?.email || profile?.businessName || 'retailer'}
                      className="w-10 h-10"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-[#342421] truncate">
                        {profile?.businessName || user?.fullName || 'Shopkeeper Desk'}
                      </p>
                      <p className="text-[11px] text-[#342421]/60 truncate font-medium">
                        {user?.email}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#342421]/30 bg-[#FF7836]/20 text-[#342421]">
                          Wholesale Partner
                        </span>
                        <span className="text-[9px] font-mono font-bold text-[#342421]/70">
                          {profile?.paymentTerms || 'NET 15'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1 space-y-1">
                    <Link
                      href="/retailer"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-[#D9EAF3] rounded-xl transition-colors"
                    >
                      <Store className="w-4 h-4 text-[#342421]" />
                      <span>Catalog & Bulk Order</span>
                    </Link>
                    <Link
                      href="/retailer/orders"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                    >
                      <Package className="w-4 h-4 text-[#342421]" />
                      <span>Wholesale Orders</span>
                    </Link>
                    <Link
                      href="/retailer/invoices"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                    >
                      <FileText className="w-4 h-4 text-[#342421]" />
                      <span>Invoices & Statement</span>
                    </Link>
                    <Link
                      href="/retailer/onboarding"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#342421]" />
                      <span>Shop Profile & Verification</span>
                    </Link>
                    <Link
                      href="/shop"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#FF7836]" />
                      <span>Direct Retail Counter</span>
                    </Link>
                  </div>

                  <div className="pt-2 mt-2 border-t border-[#342421]/15">
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
                <div className="text-[11px] font-mono text-[#342421]/70">
                  GSTIN: {profile.gstNumber || 'Unregistered'} • Terms: {profile.paymentTerms || 'NET 15'}
                </div>
                <Link
                  href="/retailer/invoices"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FFF7EB] border border-[#342421]/30 hover:bg-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#FF7836]" />
                    <span className="text-xs font-bold text-[#342421]">Outstanding Invoices</span>
                  </div>
                  <span className="text-xs font-black font-mono text-[#342421]">
                    {formatCurrency(outstandingAmount)}
                  </span>
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-[#342421] transition-all ${
                      isActive
                        ? 'bg-[#FF7836] text-[#342421] shadow-[2px_2px_0px_#342421]'
                        : 'bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
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
