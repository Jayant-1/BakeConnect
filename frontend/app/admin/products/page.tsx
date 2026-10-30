'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiClient } from '../../../lib/api/client';
import { Product, Category } from '../../../lib/api/types';
import { formatCurrency } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Package,
  Plus,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  Clock,
  Flame,
  ArrowLeft,
  X,
  Save,
  Check,
} from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'active'>('all');

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // New product form state
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    slug: '',
    categoryId: 'cat-sourdough',
    categoryName: 'Sourdough Loaves',
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
    retailPrice: 200,
    wholesalePrice: 130,
    unitCost: 70,
    unitOfMeasure: 'Loaf (700g)',
    moq: 6,
    moqIncrement: 2,
    stockQuantity: 50,
    isAvailable: true,
    isActive: true,
    fermentationHours: 24,
    dietaryTags: ['Sourdough', 'Vegan'],
    rating: 5.0,
    reviewCount: 0,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        apiClient.getProducts(),
        apiClient.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products/categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Quick Stock Adjustment
  const handleQuickStockChange = async (id: string, delta: number) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    const newQty = Math.max(0, prod.stockQuantity + delta);
    try {
      await apiClient.updateProduct(id, {
        stockQuantity: newQty,
        isAvailable: newQty > 0,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, stockQuantity: newQty, isAvailable: newQty > 0 }
            : p
        )
      );
      showNotification(`Updated stock for "${prod.name}" to ${newQty} units`);
    } catch (err) {
      console.error('Stock update failed:', err);
    }
  };

  // Toggle Availability
  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      await apiClient.updateProduct(id, { isAvailable: !current });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isAvailable: !current } : p))
      );
      showNotification(`Toggled availability`);
    } catch (err) {
      console.error('Availability toggle failed:', err);
    }
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await apiClient.updateProduct(editingProduct.id, editingProduct);
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? editingProduct : p))
      );
      setEditingProduct(null);
      showNotification(`Saved changes to "${editingProduct.name}"`);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Create Product
  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.retailPrice) {
      alert('Please fill in product name and retail price');
      return;
    }
    const slug =
      newProduct.slug ||
      newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const cat = categories.find((c) => c.id === newProduct.categoryId);

    const payload: Omit<Product, 'id'> = {
      name: newProduct.name,
      slug,
      categoryId: newProduct.categoryId || 'cat-sourdough',
      categoryName: cat?.name || 'Sourdough Loaves',
      description: newProduct.description || '',
      imageUrl: newProduct.imageUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      retailPrice: Number(newProduct.retailPrice),
      wholesalePrice: Number(newProduct.wholesalePrice || newProduct.retailPrice * 0.65),
      unitCost: Number(newProduct.unitCost || 0),
      unitOfMeasure: newProduct.unitOfMeasure || 'Unit',
      moq: Number(newProduct.moq || 6),
      moqIncrement: Number(newProduct.moqIncrement || 2),
      stockQuantity: Number(newProduct.stockQuantity || 0),
      isAvailable: Boolean(newProduct.stockQuantity && newProduct.stockQuantity > 0),
      isActive: true,
      fermentationHours: Number(newProduct.fermentationHours || 0),
      dietaryTags: newProduct.dietaryTags || ['Sourdough'],
      rating: 5.0,
      reviewCount: 0,
    };

    try {
      const created = await apiClient.createProduct(payload);
      setProducts([created, ...products]);
      setIsAddingNew(false);
      showNotification(`Added new SKU "${created.name}"`);
    } catch (err) {
      console.error('Failed to create SKU:', err);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to retire SKU "${name}"?`)) return;
    try {
      await apiClient.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showNotification(`Retired SKU "${name}"`);
    } catch (err) {
      console.error('Failed to delete SKU:', err);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSkus = products.length;
    const lowStockCount = products.filter(
      (p) => p.isAvailable && p.stockQuantity > 0 && p.stockQuantity < 20
    ).length;
    const outOfStockCount = products.filter(
      (p) => !p.isAvailable || p.stockQuantity === 0
    ).length;
    const totalInventoryValue = products.reduce(
      (acc, p) => acc + p.stockQuantity * (p.unitCost || p.wholesalePrice * 0.6),
      0
    );

    const avgRetailMargin =
      products.length > 0
        ? Math.round(
            products.reduce((acc, p) => {
              const cost = p.unitCost || p.retailPrice * 0.4;
              const margin = ((p.retailPrice - cost) / p.retailPrice) * 100;
              return acc + margin;
            }, 0) / products.length
          )
        : 0;

    return { totalSkus, lowStockCount, outOfStockCount, totalInventoryValue, avgRetailMargin };
  }, [products]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;

      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.isAvailable && p.stockQuantity > 0 && p.stockQuantity < 20;
      } else if (stockFilter === 'out') {
        matchesStock = !p.isAvailable || p.stockQuantity === 0;
      } else if (stockFilter === 'active') {
        matchesStock = p.isAvailable && p.stockQuantity > 0;
      }

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-crust-dark text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-cream-border animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />
          <span className="text-sm font-medium">{feedbackMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin"
              className="text-xs uppercase tracking-widest text-crust-muted hover:text-crust-dark transition-colors flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </Link>
            <span className="text-crust-muted/50 text-xs">/</span>
            <span className="text-xs uppercase tracking-widest text-brand-berry font-bold">
              Catalog & Stock Management
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-crust-dark">
            Product Inventory & Pricing Matrix
          </h1>
          <p className="text-xs text-crust-muted mt-1">
            Live stock counts, dual retail/wholesale prices, MOQ thresholds, and unit costs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button variant="secondary" size="sm">
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>Orders Dispatch</span>
            </Button>
          </Link>
          <Link href="/admin/reports">
            <Button variant="outline" size="sm">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              <span>Financials</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            className="font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Add New SKU</span>
          </Button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cream-surface rounded-2xl p-5 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Total Active SKUs</span>
            <Package className="w-4 h-4 text-brand-terracotta" />
          </div>
          <div className="font-display text-2xl font-bold text-crust-dark">
            {metrics.totalSkus}
          </div>
          <span className="text-[11px] text-crust-muted mt-1 block">
            Across {categories.length} production categories
          </span>
        </div>

        <div className="bg-cream-surface rounded-2xl p-5 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Low Stock Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display text-2xl font-bold text-amber-600">
            {metrics.lowStockCount}
          </div>
          <span className="text-[11px] text-crust-muted mt-1 block">
            Items under 20 units remaining
          </span>
        </div>

        <div className="bg-cream-surface rounded-2xl p-5 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Out of Stock</span>
            <X className="w-4 h-4 text-status-error" />
          </div>
          <div className="font-display text-2xl font-bold text-status-error">
            {metrics.outOfStockCount}
          </div>
          <span className="text-[11px] text-crust-muted mt-1 block">
            Unavailable for customer carts
          </span>
        </div>

        <div className="bg-cream-surface rounded-2xl p-5 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Average Retail Margin</span>
            <TrendingUp className="w-4 h-4 text-status-success" />
          </div>
          <div className="font-display text-2xl font-bold text-crust-dark">
            {metrics.avgRetailMargin}%
          </div>
          <span className="text-[11px] text-crust-muted mt-1 block">
            Inventory valuation: {formatCurrency(metrics.totalInventoryValue)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-cream-surface rounded-2xl p-5 border border-cream-border space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-crust-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, SKU slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cream-card border border-cream-border rounded-xl text-xs text-crust-dark placeholder:text-crust-muted/60 focus:outline-hidden focus:border-brand-berry"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs text-crust-muted font-medium flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Stock:
            </span>
            {(
              [
                { id: 'all', label: 'All Items' },
                { id: 'active', label: 'In Stock' },
                { id: 'low', label: 'Low Stock (<20)' },
                { id: 'out', label: 'Out of Stock' },
              ] as const
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => setStockFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  stockFilter === st.id
                    ? 'bg-crust-dark text-white'
                    : 'bg-cream-card text-crust-muted hover:text-crust-dark border border-cream-border'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
              selectedCategory === 'all'
                ? 'bg-brand-berry text-white'
                : 'bg-cream-card text-crust-muted hover:text-crust-dark border border-cream-border'
            }`}
          >
            All Categories ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-brand-berry text-white'
                    : 'bg-cream-card text-crust-muted hover:text-crust-dark border border-cream-border'
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Operational SKU Matrix Table */}
      <div className="bg-cream-surface rounded-2xl border border-cream-border shadow-xs overflow-hidden">
        <div className="p-5 border-b border-cream-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-semibold text-crust-dark">
              SKU Inventory & Price Ledger
            </h2>
            <Badge variant="default" className="text-xs">
              Showing {filteredProducts.length} of {products.length} SKUs
            </Badge>
          </div>
          <button
            onClick={loadData}
            className="text-xs text-crust-muted hover:text-crust-dark flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-cream-border text-[11px] uppercase tracking-wider text-crust-muted bg-cream-card/60">
                <th className="py-3 px-4 font-semibold">Product SKU</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Retail Price</th>
                <th className="py-3 px-4 font-semibold text-right">Wholesale (B2B)</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Cost / Margin</th>
                <th className="py-3 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-3 px-4 font-semibold text-center">B2B MOQ</th>
                <th className="py-3 px-4 font-semibold text-center">Availability</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-crust-muted">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No products match your search or filter</p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('all');
                        setStockFilter('all');
                      }}
                      className="mt-2 text-brand-berry underline hover:text-crust-dark text-xs"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const cost = p.unitCost || Math.round(p.wholesalePrice * 0.6);
                  const retailMargin = Math.round(((p.retailPrice - cost) / p.retailPrice) * 100);
                  const isLowStock = p.isAvailable && p.stockQuantity > 0 && p.stockQuantity < 20;
                  const isOut = !p.isAvailable || p.stockQuantity === 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-cream-card/40 transition-colors group"
                    >
                      {/* Product Thumbnail & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-cream-card shrink-0 border border-cream-border">
                            <Image
                              src={p.imageUrl}
                              alt={p.name}
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          </div>
                          <div>
                            <Link
                              href={`/products/${p.slug}`}
                              target="_blank"
                              className="font-medium text-crust-dark hover:text-brand-berry transition-colors line-clamp-1"
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-crust-muted">
                                {p.id}
                              </span>
                              {p.fermentationHours && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-brand-terracotta">
                                  <Flame className="w-2.5 h-2.5" />
                                  {p.fermentationHours}h levain
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-crust-muted">
                        <span className="inline-block bg-cream-card px-2 py-0.5 rounded-md border border-cream-border/60 text-[11px]">
                          {p.categoryName || 'Bakery Item'}
                        </span>
                      </td>

                      {/* Retail Price */}
                      <td className="py-3.5 px-4 text-right font-medium text-crust-dark">
                        {formatCurrency(p.retailPrice)}
                        <span className="block text-[10px] text-crust-muted font-normal">
                          / {p.unitOfMeasure}
                        </span>
                      </td>

                      {/* Wholesale Price */}
                      <td className="py-3.5 px-4 text-right font-medium text-brand-berry">
                        {formatCurrency(p.wholesalePrice)}
                        <span className="block text-[10px] text-crust-muted font-normal">
                          wholesale tier
                        </span>
                      </td>

                      {/* Unit Cost & Margin */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono text-crust-dark">
                          {formatCurrency(cost)}
                        </span>
                        <div className="mt-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              retailMargin >= 50
                                ? 'bg-status-success/15 text-status-success'
                                : retailMargin >= 30
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {retailMargin}% mgn
                          </span>
                        </div>
                      </td>

                      {/* Stock Level & Quick Adjuster */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-cream-card px-2 py-1 rounded-lg border border-cream-border">
                          <button
                            onClick={() => handleQuickStockChange(p.id, -10)}
                            disabled={p.stockQuantity <= 0}
                            className="w-5 h-5 flex items-center justify-center rounded text-xs text-crust-muted hover:text-crust-dark hover:bg-cream-border disabled:opacity-30"
                            title="Decrease 10 units"
                          >
                            -
                          </button>
                          <span
                            className={`font-mono text-xs font-bold min-w-8 text-center ${
                              isOut
                                ? 'text-status-error'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-crust-dark'
                            }`}
                          >
                            {p.stockQuantity}
                          </span>
                          <button
                            onClick={() => handleQuickStockChange(p.id, 10)}
                            className="w-5 h-5 flex items-center justify-center rounded text-xs text-crust-muted hover:text-crust-dark hover:bg-cream-border"
                            title="Add 10 units"
                          >
                            +
                          </button>
                        </div>
                        {isLowStock && (
                          <span className="block text-[10px] text-amber-600 font-medium mt-0.5">
                            Low stock
                          </span>
                        )}
                        {isOut && (
                          <span className="block text-[10px] text-status-error font-medium mt-0.5">
                            Sold out
                          </span>
                        )}
                      </td>

                      {/* B2B MOQ */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs text-crust-dark font-medium">
                          {p.moq} units
                        </span>
                        <span className="block text-[10px] text-crust-muted">
                          step +{p.moqIncrement}
                        </span>
                      </td>

                      {/* Availability Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleAvailability(p.id, p.isAvailable)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            p.isAvailable && p.stockQuantity > 0
                              ? 'bg-status-success/15 text-status-success hover:bg-status-success/25'
                              : 'bg-cream-border text-crust-muted hover:bg-cream-border/80'
                          }`}
                        >
                          {p.isAvailable && p.stockQuantity > 0 ? 'Active' : 'Halted'}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 rounded-lg text-crust-muted hover:text-brand-berry hover:bg-cream-card transition-colors"
                            title="Edit SKU Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg text-crust-muted hover:text-status-error hover:bg-cream-card transition-colors"
                            title="Retire SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-cream-surface rounded-2xl max-w-2xl w-full border border-cream-border shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-cream-border pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-crust-muted font-bold">
                  SKU Configuration
                </span>
                <h3 className="font-display text-xl font-bold text-crust-dark">
                  Edit: {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1.5 rounded-lg text-crust-muted hover:text-crust-dark hover:bg-cream-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-crust-muted mb-1 font-medium">Product Name</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Category</label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => {
                    const cat = categories.find((c) => c.id === e.target.value);
                    setEditingProduct({
                      ...editingProduct,
                      categoryId: e.target.value,
                      categoryName: cat?.name,
                    });
                  }}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Retail Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.retailPrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      retailPrice: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Wholesale Price (₹)</label>
                <input
                  type="number"
                  value={editingProduct.wholesalePrice}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      wholesalePrice: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Unit Production Cost (₹)</label>
                <input
                  type="number"
                  value={editingProduct.unitCost || 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      unitCost: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Stock Quantity (Units)</label>
                <input
                  type="number"
                  value={editingProduct.stockQuantity}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      stockQuantity: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">B2B Minimum Order Qty (MOQ)</label>
                <input
                  type="number"
                  value={editingProduct.moq}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      moq: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">MOQ Step Increment</label>
                <input
                  type="number"
                  value={editingProduct.moqIncrement}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      moqIncrement: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-crust-muted mb-1 font-medium">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-cream-border">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-crust-dark">
                <input
                  type="checkbox"
                  checked={editingProduct.isAvailable}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      isAvailable: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-brand-berry focus:ring-brand-berry"
                />
                <span>Available for retail & wholesale ordering</span>
              </label>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEdit}
                  className="font-semibold"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-cream-surface rounded-2xl max-w-2xl w-full border border-cream-border shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-cream-border pb-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-crust-muted font-bold">
                  New Product Line
                </span>
                <h3 className="font-display text-xl font-bold text-crust-dark">
                  Create Craft Bakery SKU
                </h3>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="p-1.5 rounded-lg text-crust-muted hover:text-crust-dark hover:bg-cream-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-crust-muted mb-1 font-medium">SKU Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Cardamom Cinnamon Morning Bun"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Category</label>
                <select
                  value={newProduct.categoryId}
                  onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Unit of Measure</label>
                <input
                  type="text"
                  placeholder="e.g. Piece (110g) or Loaf (750g)"
                  value={newProduct.unitOfMeasure}
                  onChange={(e) => setNewProduct({ ...newProduct, unitOfMeasure: e.target.value })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Retail Price (₹) *</label>
                <input
                  type="number"
                  placeholder="240"
                  value={newProduct.retailPrice || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, retailPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Wholesale Price (₹)</label>
                <input
                  type="number"
                  placeholder="150"
                  value={newProduct.wholesalePrice || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, wholesalePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Production Cost (₹)</label>
                <input
                  type="number"
                  placeholder="75"
                  value={newProduct.unitCost || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, unitCost: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Initial Batch Stock</label>
                <input
                  type="number"
                  placeholder="60"
                  value={newProduct.stockQuantity || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Wholesale MOQ</label>
                <input
                  type="number"
                  placeholder="12"
                  value={newProduct.moq || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, moq: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div>
                <label className="block text-crust-muted mb-1 font-medium">Fermentation Hours</label>
                <input
                  type="number"
                  placeholder="24"
                  value={newProduct.fermentationHours || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, fermentationHours: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-crust-muted mb-1 font-medium">Craft Notes & Ingredients</label>
                <textarea
                  rows={3}
                  placeholder="Cold fermented with French butter and Ceylon cinnamon..."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full px-3 py-2 bg-cream-card border border-cream-border rounded-lg text-crust-dark font-medium text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-cream-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNew(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateProduct}
                className="font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create SKU
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
