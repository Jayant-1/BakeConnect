'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../../lib/store/cart-context';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  ShoppingBag,
  Sparkles,
  Menu,
  X,
  Compass,
  Store,
  ShieldCheck,
  User,
  Search,
} from 'lucide-react';

export function Navbar() {
  const { items, setIsCartOpen, itemCount, channel, setChannel, validation } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const subtotal = validation?.subtotal ?? items.reduce((sum, i) => sum + (channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice) * i.quantity, 0);

  return (
    <header className="sticky top-0 z-40 bg-cream-base/95 backdrop-blur-md border-b border-cream-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Emblem */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-11 h-11 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Image
                  src="/images/logo-icon.png"
                  alt="BakeConnect Emblem"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-2xl font-bold tracking-tight text-[#82461D] leading-none">
                  Bake<span className="text-[#4EA72E]">Connect</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-crust-muted font-semibold mt-1">
                  Neighbourhood Bakery
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-crust-dark">
              <Link
                href="/shop"
                className="hover:text-berry-jam transition-colors flex items-center gap-1.5"
              >
                <span>Fresh Catalog</span>
              </Link>
              <Link
                href="/shop?category=cat-sourdough"
                className="hover:text-berry-jam transition-colors"
              >
                Sourdough Loaves
              </Link>
              <Link
                href="/shop?category=cat-viennoiserie"
                className="hover:text-berry-jam transition-colors"
              >
                Viennoiserie
              </Link>
              <Link
                href="/wholesale"
                className="hover:text-berry-jam transition-colors flex items-center gap-1 text-sea-tide font-semibold"
              >
                <Store className="w-4 h-4" />
                <span>Wholesale B2B</span>
              </Link>
              <Link
                href="/admin"
                className="text-xs px-2.5 py-1 rounded-full bg-cream-subtle border border-cream-border hover:bg-cream-border text-crust-muted hover:text-crust-dark transition-colors"
              >
                Bakery Admin
              </Link>
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Search Link */}
            <Link
              href="/shop"
              className="p-2 rounded-full text-crust-muted hover:text-crust-dark hover:bg-cream-subtle transition-colors hidden sm:flex"
              aria-label="Search Catalog"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* B2C vs B2B Mode Switcher */}
            <div className="hidden sm:flex items-center bg-cream-subtle p-1 rounded-full border border-cream-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChannel('B2C')}
                className={`px-3 py-1 rounded-full transition-all ${
                  channel === 'B2C'
                    ? 'bg-berry-jam text-cream-base shadow-xs'
                    : 'text-crust-muted hover:text-crust-dark'
                }`}
              >
                Retail B2C
              </button>
              <button
                type="button"
                onClick={() => setChannel('B2B')}
                className={`px-3 py-1 rounded-full transition-all ${
                  channel === 'B2B'
                    ? 'bg-sea-tide text-white shadow-xs'
                    : 'text-crust-muted hover:text-crust-dark'
                }`}
              >
                Wholesale B2B
              </button>
            </div>

            {/* Cart Button */}
            <Link href="/cart">
              <Button
                variant="primary"
                size="default"
                className="relative flex items-center gap-2 bg-berry-jam hover:bg-berry-hover text-cream-base"
                aria-label={`Open shopping basket with ${itemCount} items`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="font-semibold">{itemCount}</span>
                {itemCount > 0 && (
                  <span className="hidden sm:inline border-l border-white/20 pl-2 text-xs">
                    {formatCurrency(subtotal)}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-crust-dark hover:bg-cream-subtle focus:ring-2 focus:ring-berry-jam"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-cream-border bg-cream-surface px-6 py-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cream-border">
            <span className="text-xs uppercase tracking-wider text-crust-muted font-bold">Channel Mode</span>
            <div className="flex items-center bg-cream-subtle p-1 rounded-full border border-cream-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setChannel('B2C');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-full ${
                  channel === 'B2C' ? 'bg-berry-jam text-cream-base' : 'text-crust-muted'
                }`}
              >
                Retail B2C
              </button>
              <button
                type="button"
                onClick={() => {
                  setChannel('B2B');
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1 rounded-full ${
                  channel === 'B2B' ? 'bg-sea-tide text-white' : 'text-crust-muted'
                }`}
              >
                Wholesale B2B
              </button>
            </div>
          </div>
          <div className="flex flex-col space-y-3 text-base font-semibold text-crust-dark">
            <Link
              href="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 flex items-center justify-between"
            >
              <span>Fresh Catalog</span>
              <Compass className="w-4 h-4 text-crust-muted" />
            </Link>
            <Link
              href="/shop?category=cat-sourdough"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 text-sm text-crust-muted"
            >
              Sourdough Loaves
            </Link>
            <Link
              href="/shop?category=cat-viennoiserie"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 text-sm text-crust-muted"
            >
              Croissants & Viennoiserie
            </Link>
            <Link
              href="/wholesale"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 flex items-center justify-between text-sea-tide font-bold"
            >
              <span>Wholesale B2B Portal</span>
              <Store className="w-4 h-4" />
            </Link>
            <Link
              href="/retailer"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 text-sm text-crust-muted pl-4"
            >
              Retailer Order Guide
            </Link>
            <Link
              href="/retailer/invoices"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 text-sm text-crust-muted pl-4"
            >
              Invoices & Payment Terms
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-berry-jam py-1 flex items-center justify-between text-crust-dark border-t border-cream-border pt-3 mt-2"
            >
              <span>Bakery Admin Operations</span>
              <ShieldCheck className="w-4 h-4 text-status-success" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
