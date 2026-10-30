'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api/client';
import { Product, RetailerProfile, Order } from '../../lib/api/types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useCart } from '../../lib/store/cart-context';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Store,
  Clock,
  Truck,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function RetailerPortalPage() {
  const router = useRouter();
  const { addItem, setChannel, items } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [orderGuideQuantities, setOrderGuideQuantities] = useState<Record<string, number>>({});
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Automatically switch cart context to B2B mode when entering retailer portal
    setChannel('B2B');

    async function loadData() {
      try {
        const [userProfile, prods, orders] = await Promise.all([
          apiClient.getCurrentUser('RETAILER'),
          apiClient.getProducts({ channel: 'B2B' }),
          apiClient.getAllOrders(),
        ]);
        if (userProfile.retailerProfile) {
          setProfile(userProfile.retailerProfile);
        }
        setProducts(prods);
        setRecentOrders(orders.filter((o) => o.orderType === 'BUSINESS'));

        // Pre-fill initial quantities with MOQ
        const initialMap: Record<string, number> = {};
        prods.forEach((p) => {
          initialMap[p.id] = p.moq;
        });
        setOrderGuideQuantities(initialMap);
      } catch (err) {
        console.error('Failed to load retailer portal data:', err);
      }
    }
    loadData();
  }, [setChannel]);

  const handleQuantityChange = (productId: string, delta: number, increment: number, moq: number) => {
    setOrderGuideQuantities((prev) => {
      const current = prev[productId] || moq;
      const next = Math.max(moq, current + delta * increment);
      return { ...prev, [productId]: next };
    });
  };

  const handleAddRowToCart = (product: Product) => {
    const qty = orderGuideQuantities[product.id] || product.moq;
    addItem(product, qty);
    setAddedSuccessId(product.id);
    setTimeout(() => setAddedSuccessId(null), 1200);
  };

  const handleReorderPastOrder = (order: Order) => {
    order.items.forEach((item) => {
      const prod = products.find(
        (p) =>
          p.id === item.productId ||
          p.slug === item.productId ||
          p.name.toLowerCase() === item.productName.toLowerCase()
      );
      if (prod) {
        addItem(prod, item.quantity);
      }
    });
    router.push('/cart');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Account Status & Dispatch Schedule */}
      <div className="bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl p-6 shadow-[4px_4px_0px_#342421] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h1 className="font-display text-2xl uppercase tracking-wide text-[#342421]">
              {profile?.businessName || 'Pune Wholesale Retail Partner'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#D9EAF3] text-[#342421] text-[11px] font-bold border border-[#342421]/30">
              Approved Wholesale Account
            </span>
          </div>
          <p className="text-xs text-[#342421]/70 font-medium">
            GSTIN: <strong className="font-mono text-[#342421]">{profile?.gstNumber || '27AABCU9603R1ZM'}</strong> •
            Payment Terms: <strong className="text-[#342421]">Net-15 Invoice Settlement</strong> • Credit Limit:{' '}
            <strong className="text-[#342421]">{formatCurrency(profile?.creditLimit || 150000)}</strong>
          </p>
        </div>

        {/* Dispatch Schedule Indicator */}
        <div className="bg-white rounded-2xl p-4 border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center gap-4 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7EB] border border-[#342421]/30 text-[#FF7836] flex items-center justify-center">
            <Truck className="w-5 h-5 text-[#FF7836]" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold tracking-wider text-[#342421]/60">
              Pre-Dawn Route Dispatch
            </div>
            <div className="text-sm font-bold text-[#342421]">
              Daily <span className="text-[#FF7836]">5:30 AM Delivery</span>
            </div>
          </div>
          <Link href="/retailer/invoices">
            <button
              type="button"
              className="ml-2 px-3 py-1.5 rounded-full bg-white text-[#342421] border-2 border-[#342421] text-xs font-bold hover:bg-[#FFF7EB] transition-all flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Suggested 1-Click Reorder Bar (from past history) */}
      {recentOrders.length > 0 && (
        <div className="bg-[#D9EAF3] rounded-3xl p-6 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#342421] text-[#342421] flex items-center justify-center shadow-[2px_2px_0px_#342421]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base uppercase font-bold text-[#342421]">
                ROUTINE WEEKLY REORDER
              </h3>
              <p className="text-xs text-[#342421]/75">
                Repeat your standing wholesale bulk order ({recentOrders[0].items.length} SKUs • Total {formatCurrency(recentOrders[0].subtotal)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleReorderPastOrder(recentOrders[0])}
            className="flex-shrink-0 px-5 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Load Reorder to Basket</span>
          </button>
        </div>
      )}

      {/* The Digital Order Guide Matrix */}
      <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] overflow-hidden">
        <div className="p-6 border-b-2 border-[#342421]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl uppercase font-bold text-[#342421]">
              DIGITAL ORDER GUIDE (RAPID SKU MATRIX)
            </h2>
            <p className="text-xs text-[#342421]/70 mt-0.5 font-medium">
              Wholesale net pricing applied. Multiples of case MOQ enforced automatically.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
              All Pune Hearth Lines Active
            </span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#342421] text-white border-b-2 border-[#342421] uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-6">Product / SKU</th>
                <th className="py-3.5 px-4">Unit Spec</th>
                <th className="py-3.5 px-4">Retail MSRP</th>
                <th className="py-3.5 px-4 text-[#FF7836]">Wholesale Net</th>
                <th className="py-3.5 px-4">MOQ (Case)</th>
                <th className="py-3.5 px-4 text-center">Order Quantity</th>
                <th className="py-3.5 px-4 text-right">Line Total</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#342421]/10 text-[#342421] bg-white">
              {products.map((product) => {
                const qty = orderGuideQuantities[product.id] || product.moq;
                const lineTotal = product.wholesalePrice * qty;
                const marginPercentage = Math.round(
                  ((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100
                );
                const isAdded = addedSuccessId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-[#FFF7EB]/50 transition-colors">
                    {/* Product / Thumbnail */}
                    <td className="py-4 px-6 flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-[#FFF7EB] flex-shrink-0 border-2 border-[#342421] p-1 flex items-center justify-center">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-contain p-0.5"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-[#342421] text-sm">{product.name}</div>
                        <div className="text-[10px] text-[#342421]/60 font-mono uppercase">
                          SKU: {product.slug.slice(0, 10).toUpperCase()}
                        </div>
                      </div>
                    </td>

                    {/* Unit Spec */}
                    <td className="py-4 px-4 text-[#342421]/70 font-medium">
                      {product.unitOfMeasure}
                    </td>

                    {/* Retail MSRP */}
                    <td className="py-4 px-4 text-[#342421]/50 line-through font-mono">
                      {formatCurrency(product.retailPrice)}
                    </td>

                    {/* Net Wholesale Rate */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm text-[#FF7836] font-mono">
                        {formatCurrency(product.wholesalePrice)}
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {marginPercentage}% Margin
                      </span>
                    </td>

                    {/* MOQ */}
                    <td className="py-4 px-4 text-[#342421]/70 font-medium">
                      {product.moq} units (+{product.moqIncrement})
                    </td>

                    {/* Quantity Stepper */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center border-2 border-[#342421] rounded-full bg-white p-0.5 max-w-[120px] mx-auto shadow-[1px_1px_0px_#342421]">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, -1, product.moqIncrement, product.moq)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold font-mono text-[#342421] text-xs">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(product.id, 1, product.moqIncrement, product.moq)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[#342421] hover:bg-[#FFF7EB] transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Line Total */}
                    <td className="py-4 px-4 text-right font-bold text-[#342421] font-mono text-sm">
                      {formatCurrency(lineTotal)}
                    </td>

                    {/* Action Button */}
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddRowToCart(product)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 ml-auto ${
                          isAdded
                            ? 'bg-[#D9EAF3] text-[#342421]'
                            : 'bg-[#FF7836] hover:bg-[#FF6A1F] text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add {qty}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
