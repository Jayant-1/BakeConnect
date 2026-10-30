'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';
import { Order, Invoice, Product } from '../../../lib/api/types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Printer,
  Download,
  ArrowLeft,
  PieChart,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  CreditCard,
  Building2,
  Users,
} from 'lucide-react';

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'month' | 'week' | 'today'>('all');

  useEffect(() => {
    async function load() {
      try {
        const [allOrders, allInvs, allProds] = await Promise.all([
          apiClient.getAllOrders(),
          apiClient.getRetailerInvoices(),
          apiClient.getProducts(),
        ]);
        setOrders(allOrders);
        setInvoices(allInvs);
        setProducts(allProds);
      } catch (err) {
        console.error('Failed to load reports data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Filter orders based on time range
  const filteredOrders = useMemo(() => {
    if (timeRange === 'all') return orders;
    const now = new Date();
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (timeRange === 'today') {
        return orderDate.toDateString() === now.toDateString();
      }
      if (timeRange === 'week') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (timeRange === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [orders, timeRange]);

  // Financial Computations
  const analytics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const b2bOrders = filteredOrders.filter((o) => o.orderType === 'BUSINESS');
    const b2cOrders = filteredOrders.filter((o) => o.orderType === 'PERSONAL');

    const b2bRevenue = b2bOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const b2cRevenue = b2cOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const b2bAov = b2bOrders.length > 0 ? Math.round(b2bRevenue / b2bOrders.length) : 0;
    const b2cAov = b2cOrders.length > 0 ? Math.round(b2cRevenue / b2cOrders.length) : 0;

    // Estimated COGS (Cost of goods sold)
    let totalCogs = 0;
    for (const order of filteredOrders) {
      for (const item of order.items) {
        const prod = products.find((p) => p.id === item.productId);
        const unitCost = prod?.unitCost || Math.round(item.unitPrice * 0.45);
        totalCogs += unitCost * item.quantity;
      }
    }
    const grossProfit = Math.max(0, totalRevenue - totalCogs);
    const grossMarginPercent = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // Invoices / Accounts Receivable
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100;

    // Punctuality & Fulfillment
    const delivered = filteredOrders.filter((o) => o.status === 'DELIVERED');
    const delayed = filteredOrders.filter((o) => o.status === 'DELAYED');
    const onTimeRate =
      filteredOrders.length > 0
        ? Math.round(
            ((filteredOrders.length - delayed.length) / filteredOrders.length) * 100
          )
        : 100;

    // Top Selling Items
    const productSalesMap: Record<
      string,
      { name: string; quantity: number; revenue: number; category: string }
    > = {};

    for (const order of filteredOrders) {
      for (const item of order.items) {
        if (!productSalesMap[item.productId]) {
          const prod = products.find((p) => p.id === item.productId);
          productSalesMap[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            category: prod?.categoryName || 'Artisan Bakery',
          };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].revenue += item.lineTotal;
      }
    }

    const topSelling = Object.values(productSalesMap).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Revenue by category
    const categoryRevenueMap: Record<string, number> = {};
    for (const item of Object.values(productSalesMap)) {
      categoryRevenueMap[item.category] = (categoryRevenueMap[item.category] || 0) + item.revenue;
    }

    const categoryBreakdown = Object.entries(categoryRevenueMap)
      .map(([cat, rev]) => ({
        category: cat,
        revenue: rev,
        share: totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue,
      b2bRevenue,
      b2cRevenue,
      b2bOrdersCount: b2bOrders.length,
      b2cOrdersCount: b2cOrders.length,
      b2bAov,
      b2cAov,
      totalCogs,
      grossProfit,
      grossMarginPercent,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      collectionRate,
      onTimeRate,
      delayedCount: delayed.length,
      topSelling: topSelling.slice(0, 5),
      categoryBreakdown,
    };
  }, [filteredOrders, invoices, products]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Order Number', 'Date', 'Type', 'Customer / Business', 'Total Amount', 'Status'],
      ...filteredOrders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleDateString(),
        o.orderType,
        `"${o.businessName || o.customerName}"`,
        o.totalAmount,
        o.status,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bakeconnect-sales-report-${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 print:p-0">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
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
              Executive Analytics & Ledgers
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold text-crust-dark">
            Bakery Financial & Operations Report
          </h1>
          <p className="text-xs text-crust-muted mt-1">
            Revenues, gross margins, wholesale Net-15 receivables aging, and production volume.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Filter Buttons */}
          <div className="flex items-center bg-cream-card rounded-xl p-1 border border-cream-border text-xs">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  timeRange === t.id
                    ? 'bg-crust-dark text-white'
                    : 'text-crust-muted hover:text-crust-dark'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            <span>Print Ledger</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gross Revenue */}
        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-brand-terracotta" />
          </div>
          <div className="font-display text-3xl font-bold text-crust-dark">
            {formatCurrency(analytics.totalRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-crust-muted">
            <span className="text-brand-berry font-semibold">
              B2B: {formatCurrency(analytics.b2bRevenue)}
            </span>
            <span>•</span>
            <span>B2C: {formatCurrency(analytics.b2cRevenue)}</span>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Gross Profit (Margin)</span>
            <TrendingUp className="w-4 h-4 text-status-success" />
          </div>
          <div className="font-display text-3xl font-bold text-status-success">
            {formatCurrency(analytics.grossProfit)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-crust-muted">
            <span className="font-bold text-crust-dark">{analytics.grossMarginPercent}% margin</span>
            <span>•</span>
            <span>COGS: {formatCurrency(analytics.totalCogs)}</span>
          </div>
        </div>

        {/* B2B Receivables Collection */}
        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">Net-15 Outstanding</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-display text-3xl font-bold text-crust-dark">
            {formatCurrency(analytics.totalOutstanding)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-crust-muted">
            <span className="text-status-success font-semibold">
              {analytics.collectionRate}% collected
            </span>
            <span>•</span>
            <span>{invoices.length} commercial invoices</span>
          </div>
        </div>

        {/* Fulfillment Reliability */}
        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="flex items-center justify-between text-crust-muted mb-2">
            <span className="text-xs uppercase tracking-wider font-medium">On-Time Dispatch</span>
            <CheckCircle2 className="w-4 h-4 text-brand-berry" />
          </div>
          <div className="font-display text-3xl font-bold text-crust-dark">
            {analytics.onTimeRate}%
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-crust-muted">
            <span>{filteredOrders.length} orders total</span>
            <span>•</span>
            <span className="text-amber-600">{analytics.delayedCount} delayed</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Channel Breakdown & Category Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Channel Comparison (B2C Retail vs B2B Wholesale) */}
        <div className="bg-cream-surface rounded-2xl p-6 sm:p-7 border border-cream-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-crust-dark">
                Sales Channel Matrix
              </h2>
              <p className="text-xs text-crust-muted">
                Retail store orders vs wholesale cafe distribution
              </p>
            </div>
            <Users className="w-5 h-5 text-crust-muted" />
          </div>

          <div className="space-y-5">
            {/* B2B Wholesale */}
            <div className="bg-cream-card rounded-xl p-4 border border-cream-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-crust-dark flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-brand-berry" /> Wholesale Partner Accounts (B2B)
                </span>
                <span className="font-mono font-bold text-brand-berry">
                  {formatCurrency(analytics.b2bRevenue)}
                </span>
              </div>
              <div className="w-full bg-cream-border/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-berry h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      analytics.totalRevenue > 0
                        ? (analytics.b2bRevenue / analytics.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-crust-muted pt-1">
                <span>{analytics.b2bOrdersCount} bulk batch shipments</span>
                <span>Average Order Value: {formatCurrency(analytics.b2bAov)}</span>
              </div>
            </div>

            {/* B2C Retail */}
            <div className="bg-cream-card rounded-xl p-4 border border-cream-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-crust-dark flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-brand-terracotta" /> Direct Hearth Retail (B2C)
                </span>
                <span className="font-mono font-bold text-crust-dark">
                  {formatCurrency(analytics.b2cRevenue)}
                </span>
              </div>
              <div className="w-full bg-cream-border/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-brand-terracotta h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      analytics.totalRevenue > 0
                        ? (analytics.b2cRevenue / analytics.totalRevenue) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-crust-muted pt-1">
                <span>{analytics.b2cOrdersCount} direct home doorstep deliveries</span>
                <span>Average Order Value: {formatCurrency(analytics.b2cAov)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Production Category */}
        <div className="bg-cream-surface rounded-2xl p-6 sm:p-7 border border-cream-border space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-crust-dark">
                Production Category Breakdown
              </h2>
              <p className="text-xs text-crust-muted">
                Gross sales volume by craft category
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-crust-muted" />
          </div>

          <div className="space-y-4">
            {analytics.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-crust-dark">{cat.category}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-crust-muted text-[11px] font-mono">
                      {cat.share}%
                    </span>
                    <span className="font-mono font-bold text-crust-dark">
                      {formatCurrency(cat.revenue)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-cream-card rounded-full h-2 overflow-hidden border border-cream-border">
                  <div
                    className="bg-brand-terracotta h-2 rounded-full transition-all duration-500"
                    style={{ width: `${cat.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Best-Selling Products Leaderboard */}
      <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden shadow-xs">
        <div className="p-6 border-b border-cream-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-crust-dark">
              Bakehouse Best-Sellers Leaderboard
            </h2>
            <p className="text-xs text-crust-muted">
              Top revenue drivers across retail loaves & wholesale pastries
            </p>
          </div>
          <Flame className="w-5 h-5 text-brand-terracotta" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cream-border text-[11px] uppercase tracking-wider text-crust-muted bg-cream-card/60">
                <th className="py-3 px-6 font-semibold">Rank</th>
                <th className="py-3 px-6 font-semibold">Product Name</th>
                <th className="py-3 px-6 font-semibold">Category</th>
                <th className="py-3 px-6 font-semibold text-center">Units Sold</th>
                <th className="py-3 px-6 font-semibold text-right">Gross Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border">
              {analytics.topSelling.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-crust-muted">
                    No sales recorded for this timeframe.
                  </td>
                </tr>
              ) : (
                analytics.topSelling.map((item, index) => (
                  <tr key={item.name} className="hover:bg-cream-card/40 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-crust-muted font-mono">
                      #{index + 1}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-crust-dark">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-6 text-crust-muted">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-6 text-center font-mono font-medium text-crust-dark">
                      {item.quantity} units
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono font-bold text-brand-berry">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercial Invoices Ledger & Receivables Status */}
      <div className="bg-cream-surface rounded-2xl border border-cream-border overflow-hidden shadow-xs">
        <div className="p-6 border-b border-cream-border flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-crust-dark">
              B2B Accounts Receivable & Net-15 Credit Ledger
            </h2>
            <p className="text-xs text-crust-muted">
              Live invoice settlement status from partner cafes and supermarkets
            </p>
          </div>
          <Link href="/retailer/invoices">
            <Button variant="ghost" size="sm" className="text-xs">
              <span>View Retailer Portal</span>
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-cream-border text-[11px] uppercase tracking-wider text-crust-muted bg-cream-card/60">
                <th className="py-3 px-6 font-semibold">Invoice #</th>
                <th className="py-3 px-6 font-semibold">Partner Business</th>
                <th className="py-3 px-6 font-semibold">GSTIN</th>
                <th className="py-3 px-6 font-semibold">Issued Date</th>
                <th className="py-3 px-6 font-semibold">Due Date</th>
                <th className="py-3 px-6 font-semibold text-right">Invoice Amount</th>
                <th className="py-3 px-6 font-semibold text-right">Outstanding</th>
                <th className="py-3 px-6 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-cream-card/40 transition-colors">
                  <td className="py-3.5 px-6 font-mono font-bold text-crust-dark">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3.5 px-6 font-medium text-crust-dark">
                    {inv.retailerBusinessName}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-[11px] text-crust-muted">
                    {inv.gstNumber}
                  </td>
                  <td className="py-3.5 px-6 text-crust-muted">
                    {formatDate(inv.issuedAt)}
                  </td>
                  <td className="py-3.5 px-6 text-crust-muted font-medium">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-medium text-crust-dark">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-brand-berry">
                    {formatCurrency(inv.outstandingBalance)}
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <Badge
                      variant={
                        inv.status === 'PAID'
                          ? 'success'
                          : inv.status === 'OVERDUE'
                          ? 'error'
                          : 'warning'
                      }
                      className="text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
