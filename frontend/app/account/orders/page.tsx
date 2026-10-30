'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { useAuth } from '../../../lib/store/auth-context';
import { apiClient } from '../../../lib/api/client';
import { Order } from '../../../lib/api/types';
import { formatCurrency } from '../../../lib/utils';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowRight, Clock, CheckCircle2, AlertCircle, Package } from 'lucide-react';

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user, role, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && role === 'RETAILER') {
      router.push('/retailer');
      return;
    }

    async function loadOrders() {
      try {
        const list = await apiClient.getMyOrders();
        setOrders(list);
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrders();
  }, [authLoading, role, router]);

  return (
    <StorefrontLayout>
      <div className="bg-[#FFF7EB] min-h-[70vh] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8 pb-6 border-b-2 border-[#342421]/15 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-block bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-2 shadow-[2px_2px_0px_#342421]">
                Customer Account
              </span>
              <h1 className="font-display uppercase text-3xl sm:text-5xl text-[#342421] tracking-tight">
                MY BAKERY ORDERS
              </h1>
              <p className="font-sans text-xs sm:text-sm text-[#342421]/75 mt-1">
                View your active breakfast deliveries, celebration cake orders, and past receipts.
              </p>
            </div>

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all self-start sm:self-auto"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Order More Bakes</span>
            </Link>
          </div>

          {/* Orders List */}
          {isLoading ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-[#342421]">
              <p className="text-sm text-[#342421]/70 font-medium">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#FFF7EB] border-2 border-[#342421] text-[#FF7836] flex items-center justify-center mx-auto shadow-[2px_2px_0px_#342421]">
                <Package className="w-8 h-8" />
              </div>
              <h2 className="font-display uppercase text-2xl text-[#342421]">No orders yet</h2>
              <p className="text-xs sm:text-sm text-[#342421]/75 max-w-sm mx-auto">
                You haven&apos;t placed any bakery orders yet. Start your morning with hot ladi pav or crispy butter khari!
              </p>
              <div className="pt-2">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <span>Explore Daily Bakes</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isDelivered = order.status === 'DELIVERED';
                const isProcessing = order.status === 'PROCESSING' || order.status === 'PENDING';
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border-2 border-[#342421] p-5 sm:p-6 shadow-[3px_3px_0px_#342421] hover:shadow-[5px_5px_0px_#342421] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg text-[#342421]">
                          #{order.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isProcessing
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-[#342421]/60">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="text-xs text-[#342421]/80">
                        {order.items.map((it) => `${it.productName} × ${it.quantity}`).join(', ')}
                      </div>

                      <div className="text-xs font-semibold text-[#342421]/60">
                        Fulfillment: {order.fulfillmentType === 'PICKUP' ? 'Counter Pickup (Koregaon Park)' : 'Doorstep Delivery (Pune)'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#342421]/10">
                      <div className="text-right">
                        <div className="font-display text-xl text-[#342421]">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        <div className="text-[10px] text-[#342421]/60 uppercase tracking-wider font-bold">
                          {order.paymentStatus === 'PAID' ? 'Paid Online' : 'Payment Pending'}
                        </div>
                      </div>

                      <Link
                        href={`/order/${order.orderNumber}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#D9EAF3] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#c6e0ee] transition-all"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </StorefrontLayout>
  );
}
