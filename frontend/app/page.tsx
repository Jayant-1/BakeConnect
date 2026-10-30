'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontLayout } from '../components/layout/storefront-layout';
import { HeroShowcase } from '../components/storefront/hero-showcase';
import { ProductCard } from '../components/storefront/product-card';
import { apiClient } from '../lib/api/client';
import { useAuth } from '../lib/store/auth-context';
import { Product, Category } from '../lib/api/types';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Flame,
  Award,
  CheckCircle2,
  Store,
  MapPin,
  Clock,
  PhoneCall,
} from 'lucide-react';

type DiscoveryTab = 'everyday' | 'chai-time' | 'celebration';

interface TabConfig {
  id: DiscoveryTab;
  label: string;
  tag: string;
  categorySlug: string;
  categoryLabel: string;
}

const TABS: TabConfig[] = [
  {
    id: 'everyday',
    label: 'Everyday favourites',
    tag: 'Daily Breakfast Staples',
    categorySlug: 'pav-breads',
    categoryLabel: 'everyday breads',
  },
  {
    id: 'chai-time',
    label: 'Chai-time treats',
    tag: 'Afternoon Tea Rituals',
    categorySlug: 'khari-rusk-biscuits',
    categoryLabel: 'chai treats',
  },
  {
    id: 'celebration',
    label: 'Celebration cakes',
    tag: 'Festive & Birthday Bakes',
    categorySlug: 'celebration-cakes',
    categoryLabel: 'celebration cakes',
  },
];

export default function HomePage() {
  const { role } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('everyday');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, prods] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getProducts(),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Curated 3-4 products matching the selected craving
  const curatedProducts = useMemo(() => {
    if (products.length === 0) return [];

    if (activeTab === 'everyday') {
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes('pav') ||
          p.name.toLowerCase().includes('sourdough') ||
          p.name.toLowerCase().includes('baguette') ||
          p.name.toLowerCase().includes('burger') ||
          p.categoryName?.toLowerCase().includes('bread') ||
          p.categoryName?.toLowerCase().includes('buns')
      );
      return matches.slice(0, 4);
    }

    if (activeTab === 'chai-time') {
      const matches = products.filter(
        (p) =>
          p.name.toLowerCase().includes('khari') ||
          p.name.toLowerCase().includes('nankhatai') ||
          p.name.toLowerCase().includes('rusk') ||
          p.name.toLowerCase().includes('mawa') ||
          p.name.toLowerCase().includes('puff')
      );
      return matches.slice(0, 4);
    }

    // celebration
    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes('cake') ||
        p.name.toLowerCase().includes('brownie') ||
        p.name.toLowerCase().includes('truffle') ||
        p.categoryName?.toLowerCase().includes('celebration') ||
        p.categoryName?.toLowerCase().includes('patisserie')
    );
    return matches.slice(0, 4);
  }, [products, activeTab]);

  const activeTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];
  const khariProduct = products.find((p) => p.name.toLowerCase().includes('khari'));

  return (
    <StorefrontLayout>
      {/* 1. Hero Showcase with Controlled Asymmetry */}
      <HeroShowcase />

      {/* 2. Curated Discovery: "Find your next favourite." (Replaces catalog overload) */}
      <section
        id="bakes"
        className="scroll-mt-24 py-14 sm:py-20 border-b-2 border-[#342421] bg-[#FFF7EB]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-3 shadow-[2px_2px_0px_#342421]">
              Pune&apos;s Daily Counter
            </span>
            <h2 className="font-display uppercase text-3xl sm:text-5xl text-[#342421] tracking-tight leading-none">
              FIND YOUR NEXT FAVOURITE.
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#342421]/75 mt-3 leading-relaxed">
              Baked fresh every morning in Koregaon Park. Choose a craving to discover our most loved counter bakes.
            </p>
          </div>

          {/* 3 Deliberate Choices (Accessible Segmented Tabs) */}
          <div
            role="tablist"
            aria-label="Bakery bakes categories"
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-10"
          >
            {TABS.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`tabpanel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all border-2 border-[#342421] ${
                    isSelected
                      ? 'bg-[#FF7836] text-[#342421] shadow-[3px_3px_0px_#342421] -translate-x-0.5 -translate-y-0.5'
                      : 'bg-white text-[#342421] hover:bg-[#FFF7EB] shadow-[1px_1px_0px_#342421]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Curated Products Panel */}
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-label={activeTabConfig.label}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {curatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {curatedProducts.length === 0 && !isLoading && (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-[#342421]">
                <p className="text-sm text-[#342421]/70">
                  Refreshing morning counter bakes...
                </p>
              </div>
            )}

            {/* Curated Category Action & Full Catalog Bridge */}
            <div className="pt-6 border-t border-[#342421]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href={`/shop?category=${activeTabConfig.categorySlug}`}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#342421] hover:text-[#FF7836] underline decoration-2 underline-offset-4 transition-colors"
              >
                <span>Explore all {activeTabConfig.categoryLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_#342421] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
              >
                <span>View all 16 bakes in fresh counter</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Memorable Secondary Moment: Editorial Khari Feature */}
      <section className="py-16 sm:py-20 bg-[#FFF7EB] border-b-2 border-[#342421] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#D9EAF3] rounded-3xl border-2 border-[#342421] p-8 sm:p-12 shadow-[6px_6px_0px_#342421] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Clean, Art-Directed Product Image */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80">
                <Image
                  src="/images/cutouts/khari-cutout.png"
                  alt="Pure Butter Khari Stack"
                  fill
                  className="object-contain drop-shadow-[0_16px_32px_rgba(52,36,33,0.14)]"
                  sizes="(max-width: 768px) 256px, 320px"
                />
              </div>
            </div>

            {/* Editorial Copy & Product Binding */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-block bg-white text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-[1px_1px_0px_#342421]">
                Pune Chai-Time Ritual
              </div>
              <h2 className="font-display uppercase text-3xl sm:text-5xl text-[#342421] tracking-tight leading-none">
                MADE FOR<br />YOUR CHAI BREAK.
              </h2>
              <p className="font-sans text-sm sm:text-base text-[#342421]/80 leading-relaxed max-w-xl">
                Laminated with 100% pure churned butter and zero hydrogenated fats, our Pure Butter Khari puffs into dozens of delicate, golden sheets. Crisp, light, and made to dissolve gently in hot cutting chai.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <span className="font-display text-3xl sm:text-4xl text-[#342421]">
                  ₹{khariProduct ? khariProduct.retailPrice : 85}
                </span>
                <span className="text-xs text-[#342421]/70 font-bold uppercase tracking-wider">
                  {khariProduct?.packDetails || '250g airtight sealed box (~18 pieces)'} • 100% Eggless
                </span>
                <Link
                  href="/products/crispy-pure-butter-khari"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  <span>Order Butter Khari</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#342421]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Authentic Bakery Craft Story (Concise & Human) */}
      <section
        id="story"
        className="scroll-mt-24 py-16 sm:py-20 bg-[#FFF7EB] border-b-2 border-[#342421]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-widest text-[#FF7836] font-bold">
              The Bakery Kitchen • Pune
            </span>
            <h2 className="font-display uppercase text-3xl sm:text-5xl text-[#342421] tracking-tight leading-none mt-2">
              A LITTLE JOY, BAKED INTO YOUR DAY.
            </h2>
            <p className="font-sans text-sm text-[#342421]/75 mt-3 leading-relaxed">
              We bake with honest ingredients: real cultured butter, pure dairy mawa, freshly crushed cardamom, and zero artificial dough conditioners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Conviction 1 */}
            <div className="bg-white rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] text-[#FF7836] flex items-center justify-center mb-5 shadow-[2px_2px_0px_#342421]">
                  <Flame className="w-6 h-6 text-[#FF7836]" />
                </div>
                <h3 className="font-display text-xl uppercase text-[#342421] tracking-tight mb-2">
                  DAILY HEARTH PULLS
                </h3>
                <p className="font-sans text-xs text-[#342421]/75 leading-relaxed">
                  Stone-deck ovens pulled fresh daily so morning ladi pav and artisanal loaves reach your breakfast table warm and fragrant.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#342421]/15 text-xs font-bold text-[#342421] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Twice-daily fresh baking</span>
              </div>
            </div>

            {/* Conviction 2 */}
            <div className="bg-[#D9EAF3] rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#342421] text-[#342421] flex items-center justify-center mb-5 shadow-[2px_2px_0px_#342421]">
                  <Sparkles className="w-6 h-6 text-[#342421]" />
                </div>
                <h3 className="font-display text-xl uppercase text-[#342421] tracking-tight mb-2">
                  CULTURED BUTTER & GHEE
                </h3>
                <p className="font-sans text-xs text-[#342421]/75 leading-relaxed">
                  Our khari biscuits and nankhatai are made exclusively with real churned butter and fragrant desi ghee — never cheap hydrogenated fats.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#342421]/15 text-xs font-bold text-[#342421] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Melt-in-mouth flakiness</span>
              </div>
            </div>

            {/* Conviction 3 */}
            <div className="bg-white rounded-3xl p-7 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] text-emerald-700 flex items-center justify-center mb-5 shadow-[2px_2px_0px_#342421]">
                  <Award className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="font-display text-xl uppercase text-[#342421] tracking-tight mb-2">
                  100% EGGLESS INTEGRITY
                </h3>
                <p className="font-sans text-xs text-[#342421]/75 leading-relaxed">
                  All eggless items are prepared with separate mixing bowls, trays, and designated deck spaces, ensuring dietary confidence for vegetarian families.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#342421]/15 text-xs font-bold text-[#342421] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Certified green-dot packaging</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Wholesale Invitation for Cafes, Chai Points & Grocers - Only shown to Visitors and Wholesale Partners */}
      {role !== 'DIRECT_CUSTOMER' && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#342421] text-[#FFF7EB] rounded-3xl p-8 sm:p-12 lg:p-14 relative overflow-hidden border-2 border-[#342421] shadow-[6px_6px_0px_#FF7836]">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7836]/20 text-[#FF7836] border border-[#FF7836]/40 text-xs font-bold uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5" />
                  <span>Wholesale Bakery Distribution • Pune</span>
                </div>
                <h2 className="font-display uppercase text-3xl sm:text-5xl text-white tracking-tight leading-tight">
                  GOOD BAKES. READY FOR YOUR COUNTER.
                </h2>
                <p className="font-sans text-sm sm:text-base text-white/80 leading-relaxed max-w-2xl">
                  Stock your tea stall, modern cafe, or neighbourhood grocer with fresh ladi pav, crispy khari, rusks, and tea cakes. Direct route delivery across Pune with verified GST invoicing and Net-15 credit facilities.
                </p>
                <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold text-white/90">
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    <Truck className="w-3.5 h-3.5 text-[#FF7836]" />
                    Pre-dawn route delivery
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#FF7836]" />
                    Net-15 invoice credit
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7836]" />
                    Full GST input tax credit
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3 justify-end">
                {role === 'RETAILER' ? (
                  <Link
                    href="/retailer"
                    className="w-full text-center py-3.5 px-6 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-sm uppercase tracking-wider border-2 border-white/20 shadow-[2px_2px_0px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>Go to Shopkeeper Workspace</span>
                    <ArrowRight className="w-4 h-4 text-[#342421]" />
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/wholesale"
                      className="w-full text-center py-3.5 px-6 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-sm uppercase tracking-wider border-2 border-white/20 shadow-[2px_2px_0px_rgba(0,0,0,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                      <span>Explore Wholesale Pricing</span>
                      <ArrowRight className="w-4 h-4 text-[#342421]" />
                    </Link>
                    <Link
                      href="/signup"
                      className="w-full text-center py-3.5 px-6 rounded-full bg-transparent hover:bg-white/10 text-white font-bold text-sm uppercase tracking-wider border-2 border-white/30 transition-all"
                    >
                      <span>Register Shopkeeper Account</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Visit Our Bakery Counter */}
      <section
        id="visit"
        className="scroll-mt-24 py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t-2 border-[#342421]/15"
      >
        <div className="bg-[#D9EAF3] rounded-3xl border-2 border-[#342421] p-6 sm:p-8 shadow-[5px_5px_0px_#342421] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/70">
              Visit The Bakery Counter
            </span>
            <h3 className="font-display text-2xl uppercase text-[#342421] tracking-tight">
              DROP IN FOR WARM PAV, BUN MASKA, AND HOT CHAI
            </h3>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-[#342421]/80 pt-1">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#FF7836]" />
                Shop 4, Lane 5, Koregaon Park, Pune 411001
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#FF7836]" />
                Daily 6:00 AM – 10:30 PM
              </span>
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-[#FF7836]" />
                +91 98200 98200
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop"
              className="px-6 py-3 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] text-xs font-bold uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              Order for Delivery
            </Link>
          </div>
        </div>
      </section>
    </StorefrontLayout>
  );
}
