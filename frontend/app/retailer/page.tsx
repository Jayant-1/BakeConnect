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
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
  X,
  SlidersHorizontal,
  SearchX,
  Filter,
  Layers,
} from 'lucide-react';

export default function RetailerPortalPage() {
  const router = useRouter();
  const { addItem, setChannel, items, itemCount } = useCart();

  const cartSubtotal = React.useMemo(() => {
    return items.reduce((sum, i) => sum + (i.product?.wholesalePrice || 0) * i.quantity, 0);
  }, [items]);

  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [orderGuideQuantities, setOrderGuideQuantities] = useState<Record<string, number>>({});
  const [addedSuccessId, setAddedSuccessId] = useState<string | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Search, Category Filter, and Sort State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'FEATURED' | 'MARGIN_DESC' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC'>('FEATURED');

  // Derive unique categories with SKU counts
  const categoryOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    products.forEach((p) => {
      const catKey = p.categoryId || p.categoryName || 'other';
      const catName = p.categoryName || 'Other Bakes';
      const existing = map.get(catKey);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(catKey, { id: catKey, name: catName, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  // Real-time filtered and sorted products
  const filteredProducts = React.useMemo(() => {
    let result = products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        const catKey = p.categoryId || p.categoryName;
        if (catKey !== selectedCategory && p.categoryName !== selectedCategory) {
          return false;
        }
      }

      // Search query filter (matches name, SKU/slug, description, or category)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.slug.toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        const matchesCat = (p.categoryName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesDesc && !matchesCat) {
          return false;
        }
      }

      return true;
    });

    // Sort order
    switch (sortBy) {
      case 'MARGIN_DESC':
        return [...result].sort((a, b) => {
          const marginA = (a.retailPrice - a.wholesalePrice) / a.retailPrice;
          const marginB = (b.retailPrice - b.wholesalePrice) / b.retailPrice;
          return marginB - marginA;
        });
      case 'PRICE_ASC':
        return [...result].sort((a, b) => a.wholesalePrice - b.wholesalePrice);
      case 'PRICE_DESC':
        return [...result].sort((a, b) => b.wholesalePrice - a.wholesalePrice);
      case 'NAME_ASC':
        return [...result].sort((a, b) => a.name.localeCompare(b.name));
      case 'FEATURED':
      default:
        return result;
    }
  }, [products, searchQuery, selectedCategory, sortBy]);

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSortBy('FEATURED');
    setCurrentPage(1);
  };

  useEffect(() => {
    // Automatically switch cart context to B2B mode when entering retailer portal
    setChannel('B2B');

    async function loadData() {
      try {
        const [userProfile, prods, orders] = await Promise.all([
          apiClient.getCurrentUser('RETAILER'),
          apiClient.getProducts({ channel: 'B2B' }),
          apiClient.getMyOrders('RETAILER'),
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
            <strong className="text-[#342421]" suppressHydrationWarning>{formatCurrency(profile?.creditLimit || 150000)}</strong>
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
          <Link
            href="/retailer/invoices"
            className="ml-2 px-3 py-1.5 rounded-full bg-white text-[#342421] border-2 border-[#342421] text-xs font-bold hover:bg-[#FFF7EB] transition-all flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
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
            {items.length > 0 && (
              <Link
                href="/cart"
                className="px-3.5 py-1.5 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold hover:bg-[#FF6A1F] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>View Basket ({itemCount})</span>
              </Link>
            )}
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
              All Pune Bakery Lines Active
            </span>
            <span className="px-3 py-1 rounded-full bg-white text-[#342421] border border-[#342421]/30 text-xs font-bold font-mono">
              Page {currentPage} of {totalPages} • {filteredProducts.length} {filteredProducts.length === 1 ? 'SKU' : 'SKUs'}
            </span>
          </div>
        </div>

        {/* Search, Filter & Sort Toolbar */}
        <div className="p-4 sm:p-5 bg-[#FFF7EB] border-b-2 border-[#342421]/15 space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#342421]/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by SKU, product name, or description..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border-2 border-[#342421] text-xs font-medium text-[#342421] placeholder-[#342421]/40 shadow-[2px_2px_0px_#342421] focus:outline-none focus:ring-2 focus:ring-[#FF7836]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#FFF7EB] hover:bg-[#342421] hover:text-white border border-[#342421]/30 text-[#342421] flex items-center justify-center transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label htmlFor="retailer-sort" className="text-xs font-bold text-[#342421]/70 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#342421]" />
                <span>Sort by:</span>
              </label>
              <select
                id="retailer-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-2xl bg-white border-2 border-[#342421] px-3.5 py-2 text-xs font-bold text-[#342421] shadow-[2px_2px_0px_#342421] focus:outline-none focus:ring-2 focus:ring-[#FF7836] cursor-pointer"
              >
                <option value="FEATURED">Featured Catalog</option>
                <option value="MARGIN_DESC">Highest Margin %</option>
                <option value="PRICE_ASC">Wholesale Price: Low to High</option>
                <option value="PRICE_DESC">Wholesale Price: High to Low</option>
                <option value="NAME_ASC">Product Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Category Filter Options & Reset (100% visible, no horizontal sliding) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-xs font-bold text-[#342421]/70 mr-1 flex items-center gap-1.5 flex-shrink-0">
              <Layers className="w-3.5 h-3.5 text-[#FF7836]" />
              <span>Bakery Lines:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-full font-bold border-2 border-[#342421] transition-all text-xs flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-[#342421] text-white shadow-[2px_2px_0px_#342421]'
                  : 'bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB]'
              }`}
            >
              <span>All Lines</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                  selectedCategory === 'ALL'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FFF7EB] text-[#342421] border border-[#342421]/20'
                }`}
              >
                {products.length}
              </span>
            </button>

            {categoryOptions.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold border-2 border-[#342421] transition-all text-xs flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-[#342421] text-white shadow-[2px_2px_0px_#342421]'
                    : 'bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB]'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    selectedCategory === cat.id
                      ? 'bg-white/20 text-white'
                      : 'bg-[#FFF7EB] text-[#342421] border border-[#342421]/20'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}

            {(searchQuery || selectedCategory !== 'ALL' || sortBy !== 'FEATURED') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-auto text-xs font-bold text-[#FF7836] hover:text-[#FF6A1F] underline flex items-center gap-1 pl-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
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
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 px-6 text-center text-[#342421]">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] flex items-center justify-center text-[#342421] shadow-[2px_2px_0px_#342421]">
                        <SearchX className="w-6 h-6 text-[#FF7836]" />
                      </div>
                      <h4 className="font-bold text-sm text-[#342421]">No wholesale SKUs found</h4>
                      <p className="text-xs text-[#342421]/70">
                        {searchQuery
                          ? `No items match "${searchQuery}". Check your spelling or clear your category selection.`
                          : 'No items match the selected category filter.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-4 py-2 rounded-full bg-[#FF7836] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#FF6A1F] active:translate-x-0.5 active:translate-y-0.5 transition-all inline-flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product, idx) => {
                  const qty = orderGuideQuantities[product.id] || product.moq;
                  const lineTotal = product.wholesalePrice * qty;
                  const marginPercentage = Math.round(
                    ((product.retailPrice - product.wholesalePrice) / product.retailPrice) * 100
                  );
                  const isAdded = addedSuccessId === product.id;
                  const categoryName = product.categoryName || 'Bakery Products';
                  const prevCategory = idx > 0 ? (paginatedProducts[idx - 1].categoryName || 'Bakery Products') : null;
                  const showCategoryHeader = (sortBy === 'FEATURED' || selectedCategory !== 'ALL') && categoryName !== prevCategory;

                  return (
                    <React.Fragment key={product.id}>
                      {showCategoryHeader && (
                        <tr className="bg-[#FFF7EB] border-y-2 border-[#342421]/30">
                          <td colSpan={8} className="py-2.5 px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#FF7836] border border-[#342421]" />
                                <span className="font-display uppercase tracking-wider text-xs font-bold text-[#342421]">
                                  {categoryName}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-[#342421]/60 font-mono uppercase bg-white px-2.5 py-0.5 rounded-full border border-[#342421]/20">
                                Fresh Oven Batch
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-[#FFF7EB]/50 transition-colors">
                        {/* Product / Thumbnail */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
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
                              <div className="text-[10px] text-[#342421]/60 font-mono uppercase flex items-center gap-1.5 mt-0.5">
                                <span>SKU: {product.slug.slice(0, 10).toUpperCase()}</span>
                                <span>•</span>
                                <span className="text-[#FF7836] font-semibold">{product.categoryName || 'Bakery'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                    {/* Unit Spec */}
                    <td className="py-4 px-4 text-[#342421]/70 font-medium">
                      {product.unitOfMeasure}
                    </td>

                    {/* Retail MSRP */}
                    <td className="py-4 px-4 text-[#342421]/50 line-through font-mono" suppressHydrationWarning>
                      {formatCurrency(product.retailPrice)}
                    </td>

                    {/* Net Wholesale Rate */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm text-[#FF7836] font-mono" suppressHydrationWarning>
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
                    <td className="py-4 px-4 text-right font-bold text-[#342421] font-mono text-sm" suppressHydrationWarning>
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
                </React.Fragment>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 sm:p-5 bg-[#FFF7EB] border-t-2 border-[#342421]/15 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-xl border-2 border-[#342421] bg-white text-[#342421] font-bold text-xs shadow-[2px_2px_0px_#342421] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFF7EB] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-mono font-bold text-xs border-2 border-[#342421] transition-all flex items-center justify-center ${
                      currentPage === pageNum
                        ? 'bg-[#342421] text-white shadow-[2px_2px_0px_#342421]'
                        : 'bg-white text-[#342421] shadow-[1px_1px_0px_#342421] hover:bg-[#FFF7EB] active:translate-x-0.5 active:translate-y-0.5'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-xl border-2 border-[#342421] bg-white text-[#342421] font-bold text-xs shadow-[2px_2px_0px_#342421] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFF7EB] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
                aria-label="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Wholesale Basket Bar */}
      {items.length > 0 && (
        <aside aria-label="Wholesale Basket Summary" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="bg-[#342421] text-white rounded-2xl border-2 border-[#342421] p-3.5 sm:px-6 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-[#FF7836] text-white flex items-center justify-center shrink-0 border border-white/20">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-[#342421] text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-[#342421]">
                  {itemCount}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-[#FFF7EB]">
                  {items.length} {items.length === 1 ? 'Product' : 'Products'} in Basket
                </span>
                <span className="text-sm font-black font-mono text-[#FF7836]" suppressHydrationWarning>
                  {formatCurrency(cartSubtotal)} Wholesale Total
                </span>
              </div>
            </div>

            <Link
              href="/cart"
              className="px-5 py-2.5 rounded-xl bg-[#FF7836] hover:bg-[#FF6A1F] text-white text-xs font-black uppercase tracking-wider border-2 border-white/20 active:scale-95 transition-all flex items-center gap-2 shrink-0 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]"
            >
              <span>Review Cart</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
