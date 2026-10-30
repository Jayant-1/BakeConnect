'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../../lib/store/cart-context';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  ShoppingBag,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  ShieldCheck,
  Truck,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

import { StorefrontLayout } from '../../components/layout/storefront-layout';

export default function CartPage() {
  const {
    items,
    channel,
    setChannel,
    updateQuantity,
    removeItem,
    clearCart,
    validation,
    isValidating,
  } = useCart();

  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const subtotal =
    validation?.subtotal ??
    items.reduce(
      (sum, i) => sum + (channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice) * i.quantity,
      0
    );
  const total = validation?.totalAmount ?? subtotal;
  const isMoqMet = channel === 'B2B' ? subtotal >= 5000 : true;
  const moqThresholdRemaining = channel === 'B2B' ? Math.max(0, 5000 - subtotal) : 0;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === 'BULK25') {
      if (channel !== 'B2B') {
        setPromoMessage({ text: 'Invalid promo code for this basket.', isError: true });
      } else if (subtotal < 10000) {
        setPromoMessage({ text: 'BULK25 requires an order subtotal of at least ₹10,000.', isError: true });
      } else {
        setPromoMessage({ text: 'Promo BULK25 applied successfully!', isError: false });
      }
    } else if (promoCode.trim().toUpperCase() === 'MORNING10') {
      if (channel !== 'B2C') {
        setPromoMessage({ text: 'Invalid promo code for this basket.', isError: true });
      } else if (subtotal < 600) {
        setPromoMessage({ text: 'MORNING10 requires a minimum subtotal of ₹600.', isError: true });
      } else {
        setPromoMessage({ text: 'Promo MORNING10 applied successfully!', isError: false });
      }
    } else {
      setPromoMessage({ text: 'Invalid promo code. Please check and try again.', isError: true });
    }
  };

  if (items.length === 0) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-4xl mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-cream-subtle flex items-center justify-center text-crust-muted mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 opacity-40" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-crust-dark mb-2">
            {channel === 'B2B' ? 'Wholesale Basket is Empty' : 'Your Bread Basket is Empty'}
          </h1>
          <p className="text-sm text-crust-muted max-w-md mx-auto mb-8">
            {channel === 'B2B'
              ? 'Load your daily shop inventory from our wholesale digital order guide with commercial net pricing.'
              : 'Browse our fresh morning ladi pav, pure butter khari, and tea cakes fresh out of the oven.'}
          </p>
          <Link href={channel === 'B2B' ? '/retailer' : '/shop'}>
            <Button variant="primary" size="lg">
              {channel === 'B2B' ? 'Open Wholesale Order Guide' : "Explore Today's Fresh Bakes"}
            </Button>
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout>
      <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href={channel === 'B2B' ? '/retailer' : '/shop'}
              className="inline-flex items-center gap-1.5 text-xs text-[#342421]/70 hover:text-[#FF7836] mb-2 font-bold uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{channel === 'B2B' ? 'Back to Order Guide' : 'Continue Shopping'}</span>
            </Link>
            <h1 className="font-display uppercase text-3xl sm:text-5xl font-bold text-[#342421] tracking-tight">
              REVIEW YOUR BASKET
            </h1>
          </div>

          {/* Dedicated Basket Badge */}
          <div className="flex items-center gap-2">
            <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#FFF7EB] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] uppercase tracking-wider">
              {channel === 'B2B' ? 'Wholesale Partner Basket' : 'Retail Customer Basket'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Line Items Table (8 cols) */}
          <div className="lg:col-span-8 bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[4px_4px_0px_#342421] overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b-2 border-[#342421]/15">
              <span className="text-xs uppercase tracking-wider font-bold text-[#342421]">
                {items.length} Selected {items.length === 1 ? 'Product' : 'Products'}
              </span>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-[#342421]/60 hover:text-rose-700 font-bold"
              >
                Clear Entire Basket
              </button>
            </div>

            <div className="divide-y-2 divide-[#342421]/10">
              {items.map((item) => {
                const unitPrice =
                  channel === 'B2B' ? item.product.wholesalePrice : item.product.retailPrice;
                const lineTotal = unitPrice * item.quantity;
                const increment = channel === 'B2B' ? item.product.moqIncrement : 1;

                return (
                  <div key={item.productId} className="py-6 flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-[#FFFDF9] flex-shrink-0 border-2 border-[#342421] p-2 flex items-center justify-center">
                      <Image
                        src={item.product.imageUrl || '/images/products/fresh-ladi-pav.png'}
                        alt={item.product.name}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="hover:text-[#FF7836] transition-colors"
                      >
                        <h3 className="font-sans text-base font-bold text-[#342421]">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-[#342421]/60 mt-0.5 font-medium">
                        {formatCurrency(unitPrice)} / {item.product.unitOfMeasure}
                        {channel === 'B2B' && (
                          <span className="text-emerald-700 font-bold ml-2">Wholesale Rate</span>
                        )}
                      </p>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="flex items-center border-2 border-[#342421] rounded-full bg-white shadow-[2px_2px_0px_#342421]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - increment)}
                          className="w-8 h-8 flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] rounded-l-full transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-[#342421]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + increment)}
                          className="w-8 h-8 flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] rounded-r-full transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right w-24">
                        <div className="text-sm font-bold text-[#342421]">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-[#342421]/40 hover:text-rose-700 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Summary & Authoritative Pricing (4 cols) */}
          <div className="lg:col-span-4 bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-6">
            <h2 className="font-display uppercase text-xl font-bold text-[#342421] pb-3 border-b-2 border-[#342421]/15">
              Authoritative Summary
            </h2>

            {/* Promo Code Form */}
            <form onSubmit={handleApplyPromo} className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#342421] block">
                Promotional Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={channel === 'B2B' ? 'e.g. BULK25' : 'e.g. MORNING10'}
                  className="flex-1 px-4 py-2 rounded-full border-2 border-[#342421] bg-white text-xs font-bold text-[#342421] placeholder:text-[#342421]/40 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#342421] hover:bg-[#201513] text-white text-xs font-bold uppercase tracking-wider border-2 border-[#342421]"
                >
                  Apply
                </button>
              </div>
              {promoMessage && (
                <p
                  className={`text-xs font-bold ${
                    promoMessage.isError ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {promoMessage.text}
                </p>
              )}
            </form>

            {/* Pricing Rows */}
            <div className="space-y-2.5 text-xs text-[#342421]/70 font-medium pt-2 border-t-2 border-[#342421]/15">
              <div className="flex justify-between">
                <span>Gross Subtotal</span>
                <span className="font-bold text-[#342421]">{formatCurrency(subtotal)}</span>
              </div>

              {validation?.discountAmount ? (
                <div className="flex justify-between text-[#FF7836] font-bold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {validation.appliedDiscount?.name || 'Discount Applied'}
                  </span>
                  <span>-{formatCurrency(validation.discountAmount)}</span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>Bakery GST (5% Standard)</span>
                <span className="font-bold text-[#342421]">
                  {formatCurrency(validation?.taxAmount ?? Math.round(subtotal * 0.05))}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Morning Doorstep Delivery</span>
                <span className="font-bold text-[#342421]">
                  {validation?.deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatCurrency(validation?.deliveryFee ?? 50)
                  )}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-[#342421]/15 flex justify-between text-xl font-display uppercase font-bold text-[#342421]">
                <span>Total Payable</span>
                <span className="text-[#FF7836]">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* B2B MOQ Guardrail */}
            {channel === 'B2B' && !isMoqMet && (
              <div className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-300 text-xs font-bold text-amber-900">
                Minimum wholesale order value is ₹5,000. Add{' '}
                <strong>{formatCurrency(moqThresholdRemaining)}</strong> more to unlock wholesale checkout.
              </div>
            )}

            <Link
              href="/checkout"
              className={channel === 'B2B' && !isMoqMet ? 'pointer-events-none opacity-50 block' : 'block'}
            >
              <button
                type="button"
                disabled={Boolean(channel === 'B2B' && !isMoqMet)}
                className="w-full justify-between py-4 px-6 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all flex items-center"
              >
                <span>Proceed to Checkout</span>
                <div className="flex items-center gap-1">
                  <span>{formatCurrency(total)}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            </Link>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#342421]/60 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Encrypted Checkout • Spring Boot Authoritative</span>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
