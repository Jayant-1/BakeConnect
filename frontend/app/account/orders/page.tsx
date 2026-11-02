'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { useAuth } from '../../../lib/store/auth-context';
import { apiClient } from '../../../lib/api/client';
import { Order } from '../../../lib/api/types';
import { formatCurrency } from '../../../lib/utils';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  ArrowRight,
  Clock,
  Package,
  Sparkles,
  Flame,
  Truck,
  MapPin,
  LogIn,
  UserPlus,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  tag: string;
  isVeg: boolean;
  description: string;
}

const RECOMMENDED_BAKES: RecommendedProduct[] = [
  {
    id: 'rec-1',
    name: 'Artisan Fresh Ladi Pav (Pack of 6)',
    slug: 'fresh-ladi-pav',
    price: 40,
    image: '/images/products/fresh-ladi-pav.png',
    tag: 'Pune Morning Staple',
    isVeg: true,
    description: 'Cloud-soft, pillowy pav baked fresh every 4 hours. Perfect with butter maska or spicy misal.',
  },
  {
    id: 'rec-2',
    name: 'Pure Butter Khari (250g)',
    slug: 'pure-butter-khari',
    price: 80,
    image: '/images/products/pure-butter-khari.png',
    tag: 'Irani Chai Favorite',
    isVeg: true,
    description: 'Crispy, multi-layered puff pastry rolled with 100% pure butter. Flaky down to the last crumb.',
  },
  {
    id: 'rec-3',
    name: 'Irani Walnut Mawa Cake (Slice)',
    slug: 'irani-mawa-cake',
    price: 150,
    image: '/images/products/irani-mawa-cake.png',
    tag: 'Heritage Recipe',
    isVeg: false,
    description: 'Dense, aromatic sponge enriched with slow-cooked mawa, nutmeg, cardamom, and toasted walnuts.',
  },
  {
    id: 'rec-4',
    name: 'Desi Ghee Nankhatai (250g)',
    slug: 'desi-ghee-nankhatai',
    price: 120,
    image: '/images/products/desi-ghee-nankhatai.png',
    tag: 'Desi Ghee Classic',
    isVeg: true,
    description: 'Traditional melt-in-mouth shortbread crafted with pure desi ghee, semolina, and fresh cardamom.',
  },
];

const FAST_CATEGORIES = [
  { label: '🥖 Pav & Breads', href: '/shop?category=pav-breads' },
  { label: '🥐 Khari & Biscuits', href: '/shop?category=khari-rusk-biscuits' },
  { label: '🎂 Cakes & Pastries', href: '/shop?category=pastries-cakes' },
  { label: '🥟 Savouries & Puffs', href: '/shop?category=puffs-savouries' },
];

export default function CustomerOrdersPage() {
  const router = useRouter();
  const { user, role, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (role === 'RETAILER') {
      router.push('/retailer');
      return;
    }

    async function loadOrders() {
      setIsLoading(true);
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
      <div className="bg-[#FFF7EB] min-h-[75vh] py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="pb-6 border-b-2 border-[#342421]/15 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-2 shadow-[2px_2px_0px_#342421]">
                <Package className="w-3.5 h-3.5 text-[#FF7836]" />
                <span>Customer Account</span>
              </span>
              <h1 className="font-display uppercase text-3xl sm:text-5xl text-[#342421] tracking-tight">
                MY BAKERY ORDERS
              </h1>
              <p className="font-sans text-xs sm:text-sm text-[#342421]/75 mt-1">
                View your active morning dispatches, order history, and digital invoices.
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

          {/* 1. Loading State */}
          {isLoading ? (
            <div className="space-y-6">
              {/* Animated Bakery Status Box */}
              <div className="bg-white rounded-3xl border-2 border-[#342421] p-8 shadow-[4px_4px_0px_#342421] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] text-[#FF7836] flex items-center justify-center mx-auto shadow-[2px_2px_0px_#342421]">
                  <Clock className="w-7 h-7 animate-spin text-[#FF7836] [animation-duration:3s]" />
                </div>
                <h2 className="font-display uppercase text-2xl text-[#342421] tracking-tight">
                  Checking Hearth Dispatches...
                </h2>
                <p className="font-sans text-xs sm:text-sm text-[#342421]/70 max-w-md mx-auto">
                  Pulling live Pune morning batch dispatches, delivery milestones, and receipts from Koregaon Park...
                </p>
              </div>

              {/* Skeleton Order Cards */}
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white/80 rounded-2xl border-2 border-[#342421]/20 p-5 sm:p-6 shadow-[3px_3px_0px_#342421]/15 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-3 flex-1 w-full">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-32 bg-[#342421]/15 rounded-md" />
                        <div className="h-5 w-24 bg-[#342421]/10 rounded-full" />
                        <div className="h-4 w-20 bg-[#342421]/10 rounded" />
                      </div>
                      <div className="h-4 w-3/4 bg-[#342421]/10 rounded" />
                      <div className="h-3 w-1/2 bg-[#342421]/10 rounded" />
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#342421]/10">
                      <div className="space-y-1 text-right">
                        <div className="h-6 w-20 bg-[#342421]/15 rounded ml-auto" />
                        <div className="h-3 w-16 bg-[#342421]/10 rounded ml-auto" />
                      </div>
                      <div className="h-9 w-24 bg-[#FF7836]/25 rounded-full border border-[#342421]/20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !user ? (
            /* 2. Guest / Unauthenticated State */
            <div className="bg-white rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] p-8 sm:p-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[#FFF7EB] border-2 border-[#342421] text-[#FF7836] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#342421]">
                <LogIn className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-[#FF7836] bg-[#FF7836]/10 px-3 py-1 rounded-full border border-[#FF7836]/30">
                  Guest Session
                </span>
                <h2 className="font-display uppercase text-2xl sm:text-3xl text-[#342421]">
                  Sign In to Track Your Orders
                </h2>
                <p className="text-xs sm:text-sm text-[#342421]/75">
                  Sign in with your customer account to track live oven batches, view previous deliveries, and download your official GST invoices.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/login?redirect=/account/orders"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Account</span>
                </Link>
                <Link
                  href="/signup?role=DIRECT_CUSTOMER"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FFF7EB] text-[#342421] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
              </div>
            </div>
          ) : orders.length === 0 ? (
            /* 3. Empty State — Show "Something else" (Pune Bakery Bestsellers & Showcase) */
            <div className="space-y-8">
              {/* Main Warm Banner */}
              <div className="bg-white rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] p-8 sm:p-10 relative overflow-hidden">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 bg-[#FFF7EB] text-[#342421] border border-[#342421]/30 text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-[2px_2px_0px_#342421]">
                    <Flame className="w-3.5 h-3.5 text-[#FF7836]" />
                    <span>Hearth-Baked Daily in Koregaon Park</span>
                  </div>

                  <h2 className="font-display uppercase text-3xl sm:text-4xl text-[#342421] tracking-tight">
                    NO ORDERS IN YOUR OVEN LOG YET
                  </h2>

                  <p className="font-sans text-xs sm:text-sm text-[#342421]/80 leading-relaxed">
                    Your pantry is missing freshly baked Pune morning pav, crispy butter khari, and Irani mawa cakes.
                    Our morning batches come warm out of the ovens at <strong>6:30 AM</strong> and <strong>10:00 AM</strong>.
                    Start your day the authentic Pune way!
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href="/shop"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Start Your First Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    <Link
                      href="/#about"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-bold bg-[#D9EAF3] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      <span>Our Bakery Story</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Fast-Track Categories */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display uppercase text-lg text-[#342421] tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF7836]" />
                    <span>Explore Fresh Bakes by Category</span>
                  </h3>
                  <Link href="/shop" className="text-xs font-bold text-[#FF7836] hover:underline flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {FAST_CATEGORIES.map((cat) => (
                    <Link
                      key={cat.label}
                      href={cat.href}
                      className="bg-white rounded-2xl border-2 border-[#342421] p-3.5 text-center shadow-[3px_3px_0px_#342421] hover:bg-[#FFF7EB] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    >
                      <span className="font-sans text-xs font-bold text-[#342421] block">
                        {cat.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pune Bakery Bestsellers Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display uppercase text-xl text-[#342421] tracking-tight">
                      PUNE BAKERY BESTSELLERS
                    </h3>
                    <p className="text-xs text-[#342421]/70">
                      Handcrafted daily with cultured butter, fresh cream, and slow wood-fire baking.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {RECOMMENDED_BAKES.map((bake) => (
                    <Link
                      key={bake.id}
                      href={`/products/${bake.slug}`}
                      className="group bg-white rounded-2xl border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:shadow-[5px_5px_0px_#342421] hover:-translate-y-0.5 transition-all flex flex-col overflow-hidden"
                    >
                      {/* Product Image */}
                      <div className="relative h-36 w-full bg-[#FFF7EB] border-b-2 border-[#342421] overflow-hidden flex items-center justify-center p-3">
                        <Image
                          src={bake.image}
                          alt={bake.name}
                          width={140}
                          height={120}
                          className="object-contain max-h-32 group-hover:scale-105 transition-transform duration-300"
                        />
                        {/* FSSAI Badge */}
                        <div
                          className="absolute bottom-2 right-2 z-10 w-[18px] h-[18px] border-2 bg-white flex items-center justify-center"
                          style={{ borderColor: bake.isVeg ? '#047857' : '#78350f' }}
                          title={bake.isVeg ? 'Vegetarian' : 'Contains Egg'}
                        >
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: bake.isVeg ? '#047857' : '#78350f' }}
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7836]">
                            {bake.tag}
                          </span>
                          <h4 className="font-display text-sm text-[#342421] line-clamp-1 group-hover:text-[#FF7836] transition-colors">
                            {bake.name}
                          </h4>
                          <p className="text-[11px] text-[#342421]/70 line-clamp-2">
                            {bake.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#342421]/10 flex items-center justify-between">
                          <span className="font-display text-base text-[#342421]">
                            {formatCurrency(bake.price)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF7836] group-hover:translate-x-1 transition-transform">
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Pune Bakery Delivery Assurances */}
              <div className="bg-[#D9EAF3]/60 rounded-2xl border-2 border-[#342421] p-5 sm:p-6 shadow-[3px_3px_0px_#342421] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#342421] flex items-center justify-center text-[#FF7836] shrink-0 shadow-[1px_1px_0px_#342421]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#342421] uppercase">Counter Pickup</h4>
                    <p className="text-[11px] text-[#342421]/75 mt-0.5">
                      Ready in 30 mins at Koregaon Park, Lane 5 counter.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#342421] flex items-center justify-center text-[#FF7836] shrink-0 shadow-[1px_1px_0px_#342421]">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#342421] uppercase">Free Pune Delivery</h4>
                    <p className="text-[11px] text-[#342421]/75 mt-0.5">
                      Complimentary doorstep delivery on orders above ₹500.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white border border-[#342421] flex items-center justify-center text-[#FF7836] shrink-0 shadow-[1px_1px_0px_#342421]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#342421] uppercase">Pure Pune Craft</h4>
                    <p className="text-[11px] text-[#342421]/75 mt-0.5">
                      Desi ghee, pure butter, and no artificial preservatives.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 4. Orders List */
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
