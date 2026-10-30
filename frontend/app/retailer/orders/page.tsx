'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api/client';
import { Order, Product } from '../../../lib/api/types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { useCart } from '../../../lib/store/cart-context';
import {
  Package,
  ArrowLeft,
  Truck,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';

export default function RetailerOrdersPage() {
  const router = useRouter();
  const { addItem, setChannel } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setChannel('B2B');

    async function loadData() {
      try {
        const [allOrders, prods] = await Promise.all([
          apiClient.getAllOrders(),
          apiClient.getProducts({ channel: 'B2B' }),
        ]);
        const wholesaleOrders = allOrders.filter((o) => o.orderType === 'BUSINESS');
        setOrders(wholesaleOrders);
        setProducts(prods);
      } catch (err) {
        console.error('Failed to load wholesale orders:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [setChannel]);

  const handleReorder = (order: Order) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
          </span>
        );
      case 'PROCESSING':
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 animate-spin" /> Hearth In Production
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5" /> Route Scheduled
          </span>
        );
    }
  };

  const totalWholesaleSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-[#342421]/15">
        <div>
          <Link
            href="/retailer"
            className="inline-flex items-center gap-1.5 text-xs text-[#342421]/70 hover:text-[#FF7836] mb-2 font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Digital Order Guide</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-4xl uppercase font-bold text-[#342421] tracking-tight">
            Wholesale Orders & Dispatches
          </h1>
          <p className="text-xs sm:text-sm text-[#342421]/75 mt-1 font-medium">
            Standing orders, daily pre-dawn commercial delivery tracking, and repeat orders for your shop.
          </p>
        </div>

        <Link href="/retailer">
          <button
            type="button"
            className="px-5 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>New Bulk Stock Order</span>
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#FFF7EB] rounded-3xl p-6 border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="text-[11px] uppercase font-bold text-[#342421]/60 tracking-wider">
            Total Wholesale Orders
          </div>
          <div className="text-3xl font-display font-bold text-[#342421] mt-1">
            {orders.length}
          </div>
          <div className="text-xs text-[#342421]/70 mt-2 font-medium">
            Dispatched via Koregaon Park bakery hearth.
          </div>
        </div>

        <div className="bg-[#FFF7EB] rounded-3xl p-6 border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="text-[11px] uppercase font-bold text-[#342421]/60 tracking-wider">
            Consolidated B2B Volume
          </div>
          <div className="text-3xl font-display font-bold text-[#FF7836] mt-1">
            {formatCurrency(totalWholesaleSpend)}
          </div>
          <div className="text-xs text-[#342421]/70 mt-2 font-medium">
            Wholesale net rates with verified GST credit.
          </div>
        </div>

        <div className="bg-[#FFF7EB] rounded-3xl p-6 border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="text-[11px] uppercase font-bold text-[#342421]/60 tracking-wider">
            Daily Route Schedule
          </div>
          <div className="text-xl font-bold text-[#342421] mt-1 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#FF7836]" />
            <span>5:30 AM Guaranteed</span>
          </div>
          <div className="text-xs text-[#342421]/70 mt-2 font-medium">
            Cut-off: 9:00 PM for next-morning delivery.
          </div>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-[#342421]">
          <p className="text-sm text-[#342421]/70 font-medium">Loading wholesale orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#FFF7EB] border-2 border-[#342421] text-[#FF7836] flex items-center justify-center mx-auto shadow-[2px_2px_0px_#342421]">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="font-display uppercase text-2xl text-[#342421]">No wholesale orders yet</h2>
          <p className="text-xs sm:text-sm text-[#342421]/75 max-w-sm mx-auto font-medium">
            Your shop hasn&apos;t placed a wholesale order yet. Use the digital order guide to stock your counters for the morning rush.
          </p>
          <div className="pt-2">
            <Link
              href="/retailer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FF7836] text-white border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            >
              <span>Open Digital Order Guide</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-3xl border-2 border-[#342421] p-6 shadow-[3px_3px_0px_#342421] hover:shadow-[5px_5px_0px_#342421] transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#342421]/15">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black uppercase text-[#342421]">
                      Order #{order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D9EAF3] text-[#342421] border border-[#342421]/30">
                      Wholesale Dispatch
                    </span>
                  </div>
                  <div className="text-xs text-[#342421]/60 font-medium">
                    Placed on {formatDate(order.createdAt)} • Dispatch: 5:30 AM Pune Route
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="px-4 py-2 rounded-full bg-[#FFF7EB] hover:bg-[#FFE8CC] text-[#342421] font-bold text-xs border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421] flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#FF7836]" />
                    <span>Repeat Order</span>
                  </button>

                  <Link href={`/order/${order.id}`}>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-full bg-white hover:bg-stone-50 text-[#342421] font-bold text-xs border-2 border-[#342421] shadow-[1.5px_1.5px_0px_#342421] flex items-center gap-1.5 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </Link>
                </div>
              </div>

              {/* Items List & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-8 space-y-1.5">
                  <div className="text-xs font-bold text-[#342421]/80">SKUs in Dispatch:</div>
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl bg-[#FFF7EB] border border-[#342421]/20 font-medium text-[#342421]"
                      >
                        <strong>{item.quantity}×</strong> {item.productName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-4 flex md:flex-col items-center md:items-end justify-between text-right">
                  <div className="text-xs text-[#342421]/60 font-medium">Invoice Value:</div>
                  <div className="text-xl font-bold font-mono text-[#342421]">
                    {formatCurrency(order.totalAmount)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-bold">
                    Terms: Net-15 Settlement
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
