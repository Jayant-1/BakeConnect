'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StorefrontLayout } from '../../components/layout/storefront-layout';
import { apiClient } from '../../lib/api/client';
import { Product, Category } from '../../lib/api/types';
import { ProductCard } from '../../components/storefront/product-card';
import { Button } from '../../components/ui/button';
import { Search, SlidersHorizontal, X, Sparkles, Check } from 'lucide-react';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDietary, setSelectedDietary] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cats, prods] = await Promise.all([
          apiClient.getCategories(),
          apiClient.getProducts(),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error('Failed to load shop catalog:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Update selectedCategory if query param changes
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.categoryName?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      const matchedCat = categories.find(
        (c) =>
          c.id === selectedCategory ||
          c.slug === selectedCategory ||
          c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(selectedCategory.toLowerCase()) ||
          selectedCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      );

      result = result.filter((p) => {
        if (matchedCat && p.categoryId === matchedCat.id) return true;
        if (p.categoryId === selectedCategory) return true;
        const normPName = (p.categoryName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const normSel = selectedCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return normPName.includes(normSel) || normSel.includes(normPName);
      });
    }

    if (selectedDietary === 'eggless') {
      result = result.filter(
        (p) => p.isEggless === true || p.dietaryTags?.includes('EGGLESS')
      );
    } else if (selectedDietary === 'vegetarian') {
      result = result.filter(
        (p) => p.isVegetarian === true && !p.dietaryTags?.includes('NON_VEGETARIAN')
      );
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.retailPrice - b.retailPrice);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.retailPrice - a.retailPrice);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedDietary, sortBy]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDietary('all');
    setSortBy('featured');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedDietary !== 'all' ||
    sortBy !== 'featured';

  return (
    <div className="py-8 sm:py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-block bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          Pune Daily Hearth Catalogue
        </div>
        <h1 className="font-display uppercase text-4xl sm:text-6xl font-bold text-[#342421] tracking-tight">
          FRESH BAKERY COUNTER
        </h1>
        <p className="text-sm text-[#342421]/75 max-w-2xl leading-relaxed">
          Explore our complete selection of fresh morning ladi pav, pure butter khari, Irani mawa cakes, and artisan breads. Every order is freshly packed and dispatched from our Koregaon Park, Pune bakery.
        </p>
      </div>

      {/* Control Bar: Search, Category & Sorting */}
      <div className="bg-[#FFF7EB] rounded-3xl p-5 sm:p-6 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#342421]/60" />
            <input
              type="text"
              placeholder="Search by bake name, spice, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-sm font-medium text-[#342421] placeholder-[#342421]/50 focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#342421]/60 hover:text-[#342421]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 sm:self-end">
            <span className="text-xs text-[#342421]/70 font-bold whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-bold px-3 py-2.5 rounded-full border-2 border-[#342421] bg-white text-[#342421] focus:outline-hidden focus:ring-2 focus:ring-[#FF7836]"
            >
              <option value="featured">Featured Daily Bakes</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Category Pills Strip */}
        <div className="flex flex-wrap items-center gap-2 pb-1 pt-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421]'
                : 'bg-white text-[#342421] border-2 border-[#342421]/30 hover:border-[#342421] hover:bg-[#FFF7EB]'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => {
            const isCatSelected = selectedCategory === cat.id || selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isCatSelected
                    ? 'bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421]'
                    : 'bg-white text-[#342421] border-2 border-[#342421]/30 hover:border-[#342421] hover:bg-[#FFF7EB]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Dietary Filters & Results Counter */}
        <div className="pt-3 border-t-2 border-[#342421]/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[#342421]/70 font-bold">Dietary:</span>
            <button
              type="button"
              onClick={() => setSelectedDietary('all')}
              className={`px-3 py-1 rounded-full font-bold border-2 border-[#342421] transition ${
                selectedDietary === 'all'
                  ? 'bg-[#342421] text-white shadow-[1px_1px_0px_#342421]'
                  : 'bg-white text-[#342421] hover:bg-[#FFF7EB]'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedDietary('eggless')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full font-bold border-2 border-[#342421] transition ${
                selectedDietary === 'eggless'
                  ? 'bg-emerald-700 text-white shadow-[1px_1px_0px_#342421]'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>100% Eggless</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDietary('vegetarian')}
              className={`px-3 py-1 rounded-full font-bold border-2 border-[#342421] transition ${
                selectedDietary === 'vegetarian'
                  ? 'bg-amber-800 text-white shadow-[1px_1px_0px_#342421]'
                  : 'bg-white text-amber-900 hover:bg-amber-50'
              }`}
            >
              Pure Veg
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#342421]/70 font-medium">
              Showing <strong className="text-[#342421]">{filteredProducts.length}</strong> items
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[#FF7836] hover:underline font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] p-8">
          <div className="w-16 h-16 rounded-full bg-[#FFF7EB] border-2 border-[#342421] flex items-center justify-center text-[#342421] mx-auto mb-4">
            <Search className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="font-display uppercase text-2xl font-bold text-[#342421] mb-2">
            NO MATCHING BAKERY ITEMS FOUND
          </h3>
          <p className="text-sm text-[#342421]/70 max-w-sm mx-auto mb-6">
            We couldn&apos;t find any fresh bakes matching &quot;{searchQuery}&quot;. Try adjusting your keywords or clearing active filters.
          </p>
          <button
            type="button"
            className="px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            onClick={clearFilters}
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <StorefrontLayout>
      <Suspense
        fallback={
          <div className="py-24 text-center text-[#7A685D]">
            <div className="w-8 h-8 border-2 border-[#9C3D2B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium">Loading BakeConnect catalog...</p>
          </div>
        }
      >
        <ShopContent />
      </Suspense>
    </StorefrontLayout>
  );
}
