'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../lib/store/auth-context';
import { useCart } from '../../lib/store/cart-context';
import { ShoppingBag, Menu, X, User, Store, HelpCircle, Package, FileText, ShoppingCart, ChevronDown, LogOut } from 'lucide-react';

function getNetflixAvatar(seed: string) {
  // Vibrant Netflix-style profile palette with accessible face stroke colors
  const palettes = [
    { bg: '#E50914', face: '#FFFFFF' }, // Netflix Iconic Red
    { bg: '#0071EB', face: '#FFFFFF' }, // Electric Blue
    { bg: '#FF9900', face: '#342421' }, // Warm Amber / Orange
    { bg: '#2ECC71', face: '#FFFFFF' }, // Emerald Green
    { bg: '#9B59B6', face: '#FFFFFF' }, // Royal Purple
    { bg: '#FF7836', face: '#342421' }, // Bakery Orange
    { bg: '#00B894', face: '#FFFFFF' }, // Mint Teal
    { bg: '#FD79A8', face: '#342421' }, // Blush Rose
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

function NetflixAvatar({ seed, className = 'w-8 h-8' }: { seed: string; className?: string }) {
  const avatar = getNetflixAvatar(seed);
  return (
    <div
      style={{ backgroundColor: avatar.bg }}
      className={`relative rounded-md border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421] flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
    >
      {/* Netflix Iconic Smile SVG Face */}
      <svg viewBox="0 0 32 32" className="w-[65%] h-[65%] pointer-events-none" fill="none">
        {/* Two vertical rounded rectangle eyes */}
        <rect x="7.5" y="8" width="4" height="6.5" rx="2" fill={avatar.face} />
        <rect x="20.5" y="8" width="4" height="6.5" rx="2" fill={avatar.face} />
        {/* Characteristic Netflix curved friendly smile */}
        <path
          d="M8.5 19.5 C12 25, 20 25, 23.5 19.5"
          stroke={avatar.face}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function StorefrontHeader() {
  const { user, role, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape key press
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

  return (
    <header className="sticky top-0 z-40 bg-[#FFF7EB]/95 backdrop-blur-md border-b-2 border-[#342421]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-12 items-center h-20">
          {/* 1. Left: Brand Emblem & Title (Col 1-3) */}
          <div className="col-span-6 lg:col-span-3 flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
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
              <div className="flex flex-col">
                <span className="font-display text-2xl tracking-tight text-[#342421] leading-none">
                  Bake<span className="text-[#FF7836]">Connect</span>
                </span>
              </div>
            </Link>
          </div>

          {/* 2. Center: Role-based Navigation Links (Col 4-9) */}
          <nav className="hidden lg:flex col-span-6 justify-center items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#342421]">
            {role === 'RETAILER' ? (
              // Retailer shopkeeper navigation
              <>
                <Link href="/retailer" className="hover:text-[#FF7836] transition-colors">
                  Order Stock
                </Link>
                <Link href="/retailer/orders" className="hover:text-[#FF7836] transition-colors">
                  My Orders
                </Link>
                <Link href="/retailer/invoices" className="hover:text-[#FF7836] transition-colors">
                  Invoices
                </Link>
                <Link href="/help" className="hover:text-[#FF7836] transition-colors">
                  Help
                </Link>
              </>
            ) : role === 'DIRECT_CUSTOMER' ? (
              // Authenticated customer navigation
              <>
                <Link href="/shop" className="hover:text-[#FF7836] transition-colors">
                  Shop
                </Link>
                <Link href="/account/orders" className="hover:text-[#FF7836] transition-colors">
                  My Orders
                </Link>
                <Link href="/help" className="hover:text-[#FF7836] transition-colors">
                  Help
                </Link>
              </>
            ) : (
              // Guest / Visitor navigation
              <>
                <Link href="/#bakes" className="hover:text-[#FF7836] transition-colors">
                  Our Bakes
                </Link>
                <Link href="/#story" className="hover:text-[#FF7836] transition-colors">
                  Our Story
                </Link>
                <Link href="/wholesale" className="hover:text-[#FF7836] transition-colors">
                  For Shops
                </Link>
                <Link href="/#visit" className="hover:text-[#FF7836] transition-colors">
                  Visit Us
                </Link>
              </>
            )}
          </nav>

          {/* 3. Right: Action Controls (Col 10-12) */}
          <div className="col-span-6 lg:col-span-3 flex items-center justify-end gap-3 sm:gap-4">
            {/* Authoritative Single Cart Page Link */}
            <Link
              href="/cart"
              className="relative p-2.5 text-[#342421] hover:text-[#FF7836] transition-colors rounded-full hover:bg-white/80 border-2 border-transparent hover:border-[#342421] hover:shadow-[2px_2px_0px_#342421]"
              aria-label={`Shopping basket with ${itemCount} items`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF7836] text-[#342421] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#342421] shadow-[1px_1px_0px_#342421]">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Authenticated User Netflix Avatar & Dropdown */}
            {user ? (
              <div className="relative" ref={accountDropdownRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 p-1 rounded-lg hover:bg-white/70 transition-all focus:outline-hidden focus:ring-2 focus:ring-[#342421]"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="true"
                  aria-label="User account and profile menu"
                >
                  <NetflixAvatar
                    seed={user.email || user.id || 'bakeconnect'}
                    className="w-8 h-8 hover:scale-105 transition-transform"
                  />
                  <ChevronDown
                    className={`w-3 h-3 text-[#342421]/75 transition-transform duration-200 ${
                      accountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {accountMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-[#FFF7EB] border-2 border-[#342421] rounded-2xl shadow-[4px_4px_0px_#342421] p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    {/* User Info Header */}
                    <div className="flex items-center gap-3 p-2 bg-white/80 rounded-xl border-2 border-[#342421]/15 mb-2">
                      <NetflixAvatar
                        seed={user.email || user.id || 'bakeconnect'}
                        className="w-10 h-10"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#342421] truncate">
                          {user.fullName || (user.email ? user.email.split('@')[0] : 'Bakery Member')}
                        </p>
                        <p className="text-[11px] text-[#342421]/60 truncate font-medium">
                          {user.email}
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#342421]/30 bg-[#FF7836]/15 text-[#342421]">
                          {role === 'RETAILER'
                            ? 'Wholesale Partner'
                            : role === 'BAKERY_ADMIN'
                            ? 'Administrator'
                            : role === 'BAKERY_MANAGER'
                            ? 'Bakery Manager'
                            : 'Retail Customer'}
                        </span>
                      </div>
                    </div>

                    {/* Role-Specific Quick Navigation */}
                    <div className="py-1 space-y-1">
                      {role === 'RETAILER' ? (
                        <>
                          <Link
                            href="/retailer"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-[#D9EAF3] rounded-xl transition-colors"
                            role="menuitem"
                          >
                            <Store className="w-4 h-4 text-[#342421]" />
                            <span>Shopkeeper Desk</span>
                          </Link>
                          <Link
                            href="/retailer/orders"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                            role="menuitem"
                          >
                            <Package className="w-4 h-4 text-[#342421]" />
                            <span>Wholesale Orders</span>
                          </Link>
                          <Link
                            href="/retailer/invoices"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                            role="menuitem"
                          >
                            <FileText className="w-4 h-4 text-[#342421]" />
                            <span>Invoices & Ledger</span>
                          </Link>
                        </>
                      ) : role === 'DIRECT_CUSTOMER' ? (
                        <>
                          <Link
                            href="/account/orders"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                            role="menuitem"
                          >
                            <Package className="w-4 h-4 text-[#342421]" />
                            <span>My Orders & Receipts</span>
                          </Link>
                        </>
                      ) : (role === 'BAKERY_ADMIN' || role === 'BAKERY_MANAGER') ? (
                        <>
                          <Link
                            href={
                              role === 'BAKERY_ADMIN'
                                ? '/staff-mgmt-9a4c1f7b/admin'
                                : '/staff-mgmt-9a4c1f7b/bakery-manager'
                            }
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-[#D9EAF3] rounded-xl transition-colors"
                            role="menuitem"
                          >
                            <Store className="w-4 h-4 text-[#342421]" />
                            <span>{role === 'BAKERY_ADMIN' ? 'Admin Desk' : 'Bakery Manager Deck'}</span>
                          </Link>
                        </>
                      ) : null}

                      <Link
                        href="/help"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#342421] hover:bg-white rounded-xl transition-colors"
                        role="menuitem"
                      >
                        <HelpCircle className="w-4 h-4 text-[#342421]" />
                        <span>Help & Support</span>
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="border-t-2 border-[#342421]/15 my-2" />

                    {/* Sign Out Action inside Dropdown */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100/70 rounded-xl transition-colors text-left uppercase tracking-wider"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 text-rose-700" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#FF6A1F] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all uppercase tracking-wider"
                >
                  Login
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#342421] hover:text-[#FF7836] focus:outline-hidden focus:ring-2 focus:ring-[#342421] rounded-lg"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div id="mobile-navigation" className="lg:hidden border-t-2 border-[#342421] py-4 px-3 space-y-3 bg-[#FFF7EB]">
            {role === 'RETAILER' ? (
              <div className="space-y-2">
                <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#342421]/60">
                  Shopkeeper Workspace
                </div>
                <Link
                  href="/retailer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Order Stock
                </Link>
                <Link
                  href="/retailer/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  My Orders
                </Link>
                <Link
                  href="/retailer/invoices"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Invoices & Ledger
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Help & Support
                </Link>
              </div>
            ) : role === 'DIRECT_CUSTOMER' ? (
              <div className="space-y-2">
                <div className="px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#342421]/60">
                  Customer Counter
                </div>
                <Link
                  href="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Shop Fresh Bakes
                </Link>
                <Link
                  href="/account/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  My Orders
                </Link>
                <Link
                  href="/help"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Help & Support
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/#bakes"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Our Bakes
                </Link>
                <Link
                  href="/#story"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Our Story
                </Link>
                <Link
                  href="/wholesale"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  For Shops (Wholesale)
                </Link>
                <Link
                  href="/#visit"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-sm font-bold text-[#342421] hover:text-[#FF7836]"
                >
                  Visit Us & Timings
                </Link>
              </div>
            )}

            <div className="pt-3 border-t-2 border-[#342421]/15 flex flex-col gap-2">
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-xs font-bold bg-white text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>View Basket ({itemCount})</span>
              </Link>
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-center py-2 rounded-full text-xs font-bold text-rose-700 hover:underline uppercase tracking-wider"
                >
                  Sign Out ({user.email})
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 rounded-full text-xs font-bold border-2 border-[#342421] text-[#342421] bg-white shadow-[2px_2px_0px_#342421] uppercase tracking-wider"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2 rounded-full text-xs font-bold bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] uppercase tracking-wider"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
