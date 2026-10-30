'use client';

import React, { useState, useEffect, use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/store/auth-context';
import { backendClient } from '../../../lib/api/backend-client';
import {
  SalesSummaryReport,
  TopProductItem,
  RetailerProfile,
  RetailerApprovalStatus,
  PaymentTerms,
} from '../../../lib/api/types-v2';
import { formatCurrency } from '../../../lib/utils';
import {
  Shield,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Calendar,
  Filter,
  Flame,
  Award,
  CreditCard,
  ChefHat,
  Percent,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function AdminWorkspacePage({
  params,
}: {
  params: Promise<{ staffPrefix: string }>;
}) {
  const resolvedParams = use(params);
  const staffPrefix = resolvedParams.staffPrefix;
  const configuredPrefix = process.env.NEXT_PUBLIC_STAFF_PREFIX || 'staff-mgmt-9a4c1f7b';

  if (staffPrefix !== configuredPrefix) {
    notFound();
  }

  const router = useRouter();
  const { user, role, isAuthenticated, isLoading } = useAuth();

  // Active view tab: 'overview' | 'leaderboards' | 'retailers'
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboards' | 'retailers'>('overview');

  // Executive Sales Report State
  const [salesSummary, setSalesSummary] = useState<SalesSummaryReport | null>(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '30d' | '7d'>('all');

  // Product Leaderboard State
  const [leaderboard, setLeaderboard] = useState<TopProductItem[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'CUSTOMER' | 'WHOLESALE'>('ALL');
  const [sortMetric, setSortMetric] = useState<'QUANTITY' | 'REVENUE' | 'ORDER_COUNT'>('QUANTITY');

  // Retailer Approvals Desk State
  const [retailers, setRetailers] = useState<RetailerProfile[]>([]);
  const [retailersLoading, setRetailersLoading] = useState(true);
  const [retailerStatusFilter, setRetailerStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED'>('PENDING_APPROVAL');
  const [selectedRetailer, setSelectedRetailer] = useState<RetailerProfile | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvalTerms, setApprovalTerms] = useState<PaymentTerms>('NET_15_DAYS');
  const [approvalCreditLimit, setApprovalCreditLimit] = useState<number>(25000);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Enforce admin permission
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.push(`/${staffPrefix}/login?redirect=${encodeURIComponent(`/${staffPrefix}/admin`)}`);
      return;
    }
    if (role !== 'BAKERY_ADMIN') {
      router.push(`/${staffPrefix}/bakery-manager`);
    }
  }, [isLoading, isAuthenticated, user, role, router, staffPrefix]);

  // Load Sales Summary
  const loadSalesSummary = async () => {
    setSalesLoading(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();

      if (dateRange === '7d') {
        const start = new Date();
        start.setDate(now.getDate() - 7);
        startDate = start.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      } else if (dateRange === '30d') {
        const start = new Date();
        start.setDate(now.getDate() - 30);
        startDate = start.toISOString().split('T')[0];
        endDate = now.toISOString().split('T')[0];
      }

      const summary = await backendClient.getSalesSummary(startDate, endDate);
      setSalesSummary(summary);
    } catch (err: any) {
      console.warn('Could not load sales summary:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Load Product Leaderboard
  const loadLeaderboard = async () => {
    setLeaderboardLoading(true);
    try {
      const items = await backendClient.getTopProducts({
        channel: channelFilter,
        sortBy: sortMetric,
        limit: 15,
      });
      setLeaderboard(items);
    } catch (err: any) {
      console.warn('Could not load leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Load Retailers
  const loadRetailers = async () => {
    setRetailersLoading(true);
    try {
      const page = await backendClient.getAllRetailers(retailerStatusFilter, 0, 50);
      setRetailers(page.content || []);
    } catch (err: any) {
      console.warn('Could not load retailers:', err);
    } finally {
      setRetailersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'BAKERY_ADMIN') {
      loadSalesSummary();
    }
  }, [dateRange, isAuthenticated, role]);

  useEffect(() => {
    if (isAuthenticated && role === 'BAKERY_ADMIN') {
      loadLeaderboard();
    }
  }, [channelFilter, sortMetric, isAuthenticated, role]);

  useEffect(() => {
    if (isAuthenticated && role === 'BAKERY_ADMIN') {
      loadRetailers();
    }
  }, [retailerStatusFilter, isAuthenticated, role]);

  const handleOpenApproval = (retailer: RetailerProfile, decision: 'APPROVED' | 'REJECTED') => {
    setSelectedRetailer(retailer);
    setApprovalDecision(decision);
    setApprovalTerms(retailer.paymentTerms || 'NET_15_DAYS');
    setApprovalCreditLimit(retailer.creditLimit || 25000);
    setApprovalNotes('');
    setApprovalModalOpen(true);
    setFeedback(null);
  };

  const submitRetailerDecision = async () => {
    if (!selectedRetailer) return;
    setActionInProgress(true);
    setFeedback(null);
    try {
      await backendClient.approveRetailer(selectedRetailer.id, {
        approvalStatus: approvalDecision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        paymentTerms: approvalTerms,
        creditLimit: approvalCreditLimit,
        reason: approvalNotes || `Retailer ${approvalDecision.toLowerCase()} by administrator`,
      });

      setFeedback({
        type: 'success',
        message: `${selectedRetailer.businessName} has been ${approvalDecision.toLowerCase()} successfully with ${approvalTerms} terms.`,
      });
      setApprovalModalOpen(false);
      setSelectedRetailer(null);
      await loadRetailers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit retailer decision.',
      });
    } finally {
      setActionInProgress(false);
    }
  };

  if (isLoading || !isAuthenticated || role !== 'BAKERY_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7836]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Context Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-[#342421]/15">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#342421] text-[#FFF7EB]">
              <Shield className="w-3.5 h-3.5 text-[#FF7836]" />
              Bakery Administrator Deck
            </span>
            <span className="text-xs text-[#342421]/60 font-medium">
              Koregaon Park & Viman Nagar, Pune
            </span>
          </div>
          <h1 className="text-3xl font-display uppercase tracking-tight text-[#342421]">
            Executive Governance & Commercial Analytics
          </h1>
          <p className="text-sm text-[#342421]/75 mt-1 font-medium">
            Monitor B2C vs B2B revenue splits, review wholesale partner credit applications, and track product performance across Pune.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/${staffPrefix}/bakery-manager`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF7EB] border-2 border-[#342421] text-xs font-bold uppercase tracking-wider text-[#342421] hover:bg-white transition-all shadow-[3px_3px_0px_#342421] hover:translate-x-0.5 hover:translate-y-0.5"
          >
            <ChefHat className="w-4 h-4 text-[#FF7836]" />
            Switch to Manager Deck
          </Link>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border-2 flex items-start justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-[#EBF7EE] border-[#2D7A4D] text-[#1E5234]'
              : 'bg-[#FDF0EE] border-[#C2410C] text-[#9A3412]'
          }`}
        >
          <div className="flex items-center gap-2.5 font-bold text-sm">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="font-bold text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#342421]/15 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-display uppercase text-sm tracking-wider transition-all ${
            activeTab === 'overview'
              ? 'bg-[#342421] text-[#FFF7EB] shadow-[3px_3px_0px_#FF7836]'
              : 'text-[#342421]/70 hover:text-[#342421] hover:bg-white/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#FF7836]" />
          Executive Overview & Sales
        </button>

        <button
          onClick={() => setActiveTab('leaderboards')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-display uppercase text-sm tracking-wider transition-all ${
            activeTab === 'leaderboards'
              ? 'bg-[#342421] text-[#FFF7EB] shadow-[3px_3px_0px_#FF7836]'
              : 'text-[#342421]/70 hover:text-[#342421] hover:bg-white/60'
          }`}
        >
          <Award className="w-4 h-4 text-[#FF7836]" />
          Product Leaderboards
        </button>

        <button
          onClick={() => setActiveTab('retailers')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-display uppercase text-sm tracking-wider transition-all ${
            activeTab === 'retailers'
              ? 'bg-[#342421] text-[#FFF7EB] shadow-[3px_3px_0px_#FF7836]'
              : 'text-[#342421]/70 hover:text-[#342421] hover:bg-white/60'
          }`}
        >
          <Building className="w-4 h-4 text-[#FF7836]" />
          Retailer Approvals Desk
          {retailers.filter((r) => r.approvalStatus === 'PENDING_APPROVAL').length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#FF7836] text-[#342421] text-[10px] font-black rounded-full">
              {retailers.filter((r) => r.approvalStatus === 'PENDING_APPROVAL').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW & SALES */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF7836]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#342421]">
                Business Period (Pune Asia/Kolkata)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', '30d', '7d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    dateRange === range
                      ? 'bg-[#FF7836] text-[#342421] border border-[#342421]'
                      : 'bg-[#FFF7EB] text-[#342421]/80 hover:bg-[#F2E5D0]'
                  }`}
                >
                  {range === 'all' ? 'All Time' : range === '30d' ? 'Last 30 Days' : 'Last 7 Days'}
                </button>
              ))}
              <button
                onClick={loadSalesSummary}
                className="p-1.5 rounded-lg hover:bg-[#FFF7EB] text-[#342421]"
                title="Refresh Analytics"
              >
                <RefreshCw className={`w-4 h-4 ${salesLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Primary Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Net Sales */}
            <div className="bg-[#FFF7EB] p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
              <div className="flex items-center justify-between text-[#342421]/70 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Net Sales</span>
                <DollarSign className="w-4 h-4 text-[#FF7836]" />
              </div>
              <div className="text-3xl font-display tracking-tight text-[#342421]">
                {salesSummary ? formatCurrency(salesSummary.netSales) : '₹0.00'}
              </div>
              <p className="text-[11px] text-[#342421]/60 mt-1 font-semibold">
                Gross: {salesSummary ? formatCurrency(salesSummary.grossSales) : '₹0.00'}
              </p>
            </div>

            {/* Total Orders */}
            <div className="bg-[#FFF7EB] p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
              <div className="flex items-center justify-between text-[#342421]/70 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Orders Placed</span>
                <Package className="w-4 h-4 text-[#FF7836]" />
              </div>
              <div className="text-3xl font-display tracking-tight text-[#342421]">
                {salesSummary ? salesSummary.totalOrders : 0}
              </div>
              <p className="text-[11px] text-[#342421]/60 mt-1 font-semibold">
                Across Retail & Wholesale
              </p>
            </div>

            {/* Blended AOV */}
            <div className="bg-[#FFF7EB] p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
              <div className="flex items-center justify-between text-[#342421]/70 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Blended AOV</span>
                <TrendingUp className="w-4 h-4 text-[#FF7836]" />
              </div>
              <div className="text-3xl font-display tracking-tight text-[#342421]">
                {salesSummary ? formatCurrency(salesSummary.blendedAov) : '₹0.00'}
              </div>
              <p className="text-[11px] text-[#342421]/60 mt-1 font-semibold">
                Average order basket size
              </p>
            </div>

            {/* Gross Margin Guardrail */}
            <div className="bg-[#FFF7EB] p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
              <div className="flex items-center justify-between text-[#342421]/70 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Gross Margin</span>
                <Percent className="w-4 h-4 text-[#FF7836]" />
              </div>
              {salesSummary?.marginStatus === 'AVAILABLE' ? (
                <>
                  <div className="text-3xl font-display tracking-tight text-[#2D7A4D]">
                    {salesSummary.grossMarginPercentage?.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-[#2D7A4D] mt-1 font-semibold">
                    Net: {formatCurrency(salesSummary.grossMargin)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-[#9C3D2B] uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4" />
                    Unit Costs Gated
                  </div>
                  <p className="text-[10px] text-[#342421]/70 mt-1 leading-tight font-medium">
                    Recipe cost audit active. Real margins unlocked once all unit costs are recorded.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Detailed B2C vs B2B Comparison Split Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Direct Channel (B2C) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#342421]/10">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#FF7836]">
                    <Users className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-display uppercase text-lg text-[#342421]">
                      Direct Customers (B2C)
                    </h3>
                    <span className="text-[11px] text-[#342421]/60 font-semibold">
                      Individual Retail Orders & Cafe Counter
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-[#D9EAF3] text-[#1E3A8A] text-xs font-bold rounded-full">
                  Retail Channel
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Orders
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? salesSummary.b2cOrdersCount : 0}
                  </span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Gross Sales
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? formatCurrency(salesSummary.b2cGrossSales) : '₹0.00'}
                  </span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Average Basket
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? formatCurrency(salesSummary.b2cAov) : '₹0.00'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#342421]/75 leading-relaxed font-medium">
                Customer purchases in Pune typically feature fresh morning ladi pav, daily sandwich loaves, and weekend mawa cakes.
              </p>
            </div>

            {/* Wholesale Network Channel (B2B) */}
            <div className="bg-white p-6 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#342421]/10">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#FF7836]">
                    <Building className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-display uppercase text-lg text-[#342421]">
                      Wholesale Retailers (B2B)
                    </h3>
                    <span className="text-[11px] text-[#342421]/60 font-semibold">
                      Bulk Grocery Stores, Cafes & Quick-Serves
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-[#FFF7EB] border border-[#FF7836] text-[#FF7836] text-xs font-bold rounded-full">
                  Wholesale Channel
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Orders
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? salesSummary.b2bOrdersCount : 0}
                  </span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Gross Sales
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? formatCurrency(salesSummary.b2bGrossSales) : '₹0.00'}
                  </span>
                </div>
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#342421]/15">
                  <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-1">
                    Average Basket
                  </span>
                  <span className="text-xl font-display text-[#342421]">
                    {salesSummary ? formatCurrency(salesSummary.b2bAov) : '₹0.00'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#342421]/75 leading-relaxed font-medium">
                Wholesale retailers order crate packs of burger buns, bulk ladi pav, and sliced bread loaves with Net 15 commercial credit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT LEADERBOARDS */}
      {activeTab === 'leaderboards' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
            {/* Channel Filters */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/70">
                Channel:
              </span>
              <div className="flex items-center gap-1.5">
                {(['ALL', 'CUSTOMER', 'WHOLESALE'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      channelFilter === ch
                        ? 'bg-[#342421] text-[#FFF7EB] shadow-[2px_2px_0px_#FF7836]'
                        : 'bg-[#FFF7EB] text-[#342421]/80 hover:bg-[#F2E5D0]'
                    }`}
                  >
                    {ch === 'ALL' ? 'Overall' : ch === 'CUSTOMER' ? 'Customer (B2C)' : 'Wholesale (B2B)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Metric */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/70">
                Sort By:
              </span>
              <div className="flex items-center gap-1.5">
                {(['QUANTITY', 'REVENUE', 'ORDER_COUNT'] as const).map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSortMetric(metric)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      sortMetric === metric
                        ? 'bg-[#FF7836] text-[#342421] border border-[#342421]'
                        : 'bg-[#FFF7EB] text-[#342421]/80 hover:bg-[#F2E5D0]'
                    }`}
                  >
                    {metric === 'QUANTITY' ? 'Quantity Sold' : metric === 'REVENUE' ? 'Net Sales' : 'Order Count'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] overflow-hidden">
            <div className="p-4 bg-[#FFF7EB] border-b-2 border-[#342421] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#FF7836]" />
                <h3 className="font-display uppercase text-lg text-[#342421]">
                  Top Baked Products Ranking
                </h3>
              </div>
              <span className="text-xs text-[#342421]/70 font-bold uppercase tracking-wider">
                Ranked by {sortMetric.replace('_', ' ')} • Includes % Growth vs Prev Period
              </span>
            </div>

            {leaderboardLoading ? (
              <div className="p-12 text-center text-sm font-semibold text-[#342421]/60">
                Loading product analytics...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center text-sm font-semibold text-[#342421]/60">
                No orders recorded for this channel criteria yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#342421]">
                  <thead className="bg-[#FAF7F2] border-b-2 border-[#342421]/15 uppercase font-display text-[11px] tracking-wider text-[#342421]/70">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">Rank</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4 text-right">Units Sold</th>
                      <th className="py-3 px-4 text-right">Net Sales</th>
                      <th className="py-3 px-4 text-right">Orders</th>
                      <th className="py-3 px-4 text-center">Growth vs Prev Period</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#342421]/10">
                    {leaderboard.map((prod, idx) => (
                      <tr key={prod.productId} className="hover:bg-[#FFF7EB]/60 transition-colors">
                        <td className="py-3.5 px-4 text-center font-display text-sm">
                          {idx === 0 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FF7836] text-[#342421] font-bold">
                              1
                            </span>
                          ) : idx === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D9EAF3] text-[#342421] font-bold">
                              2
                            </span>
                          ) : idx === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F2E5D0] text-[#342421] font-bold">
                              3
                            </span>
                          ) : (
                            `#${idx + 1}`
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-sm block text-[#342421]">
                            {prod.productName}
                          </span>
                          <span className="text-[10px] text-[#342421]/50 font-mono">
                            /{prod.productSlug}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-display text-sm font-semibold">
                          {prod.totalQuantitySold.toLocaleString()} units
                        </td>
                        <td className="py-3.5 px-4 text-right font-display text-sm font-bold text-[#FF7836]">
                          {formatCurrency(prod.totalRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          {prod.orderCount} orders
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {prod.quantityGrowthPercentage !== undefined && prod.quantityGrowthPercentage !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                prod.quantityGrowthPercentage >= 0
                                  ? 'bg-[#EBF7EE] text-[#1E5234]'
                                  : 'bg-[#FDF0EE] text-[#9A3412]'
                              }`}
                            >
                              {prod.quantityGrowthPercentage >= 0 ? '+' : ''}
                              {prod.quantityGrowthPercentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#342421]/40">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RETAILER APPROVALS DESK */}
      {activeTab === 'retailers' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/70">
                Application Status:
              </span>
              <div className="flex items-center gap-1.5">
                {(['PENDING_APPROVAL', 'APPROVED', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRetailerStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                      retailerStatusFilter === st
                        ? 'bg-[#342421] text-[#FFF7EB] shadow-[2px_2px_0px_#FF7836]'
                        : 'bg-[#FFF7EB] text-[#342421]/80 hover:bg-[#F2E5D0]'
                    }`}
                  >
                    {st === 'PENDING_APPROVAL' ? 'Pending Review' : st === 'APPROVED' ? 'Approved Partners' : 'All Accounts'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadRetailers}
              className="p-1.5 rounded-lg hover:bg-[#FFF7EB] text-[#342421] self-end sm:self-auto"
              title="Refresh Retailer List"
            >
              <RefreshCw className={`w-4 h-4 ${retailersLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Retailer Applications Grid */}
          {retailersLoading ? (
            <div className="p-12 text-center text-sm font-semibold text-[#342421]/60 bg-white rounded-2xl border-2 border-[#342421]">
              Loading retailer profiles...
            </div>
          ) : retailers.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-[#342421]/60 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
              No retailer profiles found for "{retailerStatusFilter}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {retailers.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display uppercase text-base text-[#342421]">
                          {r.businessName}
                        </h4>
                        <span className="text-[11px] font-mono text-[#342421]/60 block">
                          GSTIN: {r.gstNumber || 'Not Provided (Proprietor)'}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.approvalStatus === 'APPROVED'
                            ? 'bg-[#EBF7EE] text-[#1E5234] border border-[#2D7A4D]'
                            : r.approvalStatus === 'PENDING_APPROVAL'
                            ? 'bg-[#FFF7EB] text-[#FF7836] border border-[#FF7836]'
                            : 'bg-[#FDF0EE] text-[#9A3412] border border-[#C2410C]'
                        }`}
                      >
                        {r.approvalStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#342421]/15 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[#342421]/80">
                        <span className="font-bold">Contact Person:</span>
                        <span>{r.contactPersonName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#342421]/80">
                        <span className="font-bold">Phone:</span>
                        <span>{r.contactPhone}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#342421]/80">
                        <span className="font-bold">Payment Terms:</span>
                        <span className="font-semibold text-[#FF7836]">
                          {r.paymentTerms || 'IMMEDIATE'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[#342421]/80">
                        <span className="font-bold">Credit Limit:</span>
                        <span className="font-bold">{formatCurrency(r.creditLimit || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    {r.approvalStatus === 'PENDING_APPROVAL' ? (
                      <>
                        <button
                          onClick={() => handleOpenApproval(r, 'APPROVED')}
                          className="flex-1 py-2 rounded-xl bg-[#2D7A4D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#23603D] transition-colors flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#1E1412]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleOpenApproval(r, 'REJECTED')}
                          className="py-2 px-3 rounded-xl bg-white border border-[#C2410C] text-[#C2410C] text-xs font-bold uppercase tracking-wider hover:bg-[#FDF0EE] transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenApproval(r, 'APPROVED')}
                        className="w-full py-2 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#342421] text-xs font-bold uppercase tracking-wider hover:bg-[#F2E5D0] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4 text-[#FF7836]" />
                        Adjust Terms & Credit Limit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Retailer Approval / Terms Modal */}
      {approvalModalOpen && selectedRetailer && (
        <div className="fixed inset-0 z-50 bg-[#342421]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF7EB] rounded-2xl border-2 border-[#342421] shadow-[6px_6px_0px_#342421] max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7836]">
                  Retailer Application Review
                </span>
                <h3 className="font-display uppercase text-xl text-[#342421]">
                  {selectedRetailer.businessName}
                </h3>
                <span className="text-xs text-[#342421]/60 font-mono">
                  GST: {selectedRetailer.gstNumber || 'Not provided'}
                </span>
              </div>
              <button
                onClick={() => setApprovalModalOpen(false)}
                className="text-[#342421]/60 hover:text-[#342421] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                  Approval Action
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('APPROVED')}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                      approvalDecision === 'APPROVED'
                        ? 'bg-[#2D7A4D] text-white border-[#1E5234]'
                        : 'bg-white text-[#342421] border-[#342421]/20'
                    }`}
                  >
                    Grant Wholesale Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setApprovalDecision('REJECTED')}
                    className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                      approvalDecision === 'REJECTED'
                        ? 'bg-[#C2410C] text-white border-[#9A3412]'
                        : 'bg-white text-[#342421] border-[#342421]/20'
                    }`}
                  >
                    Decline Application
                  </button>
                </div>
              </div>

              {approvalDecision === 'APPROVED' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                      Commercial Payment Terms
                    </label>
                    <select
                      value={approvalTerms}
                      onChange={(e) => setApprovalTerms(e.target.value as PaymentTerms)}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-semibold text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                    >
                      <option value="IMMEDIATE">IMMEDIATE (Pay on Order / Delivery)</option>
                      <option value="NET_3_DAYS">NET 3 DAYS (Rolling Credit)</option>
                      <option value="NET_15_DAYS">NET 15 DAYS (Standard Pune B2B Term)</option>
                      <option value="CUSTOM">CUSTOM (Agreement Defined)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                      Wholesale Credit Limit (₹ INR)
                    </label>
                    <input
                      type="number"
                      value={approvalCreditLimit}
                      onChange={(e) => setApprovalCreditLimit(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-semibold text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                      min="0"
                      step="5000"
                    />
                    <span className="text-[10px] text-[#342421]/60 mt-1 block">
                      Recommended baseline: ₹25,000 for verified retail groceries in Pune.
                    </span>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                  Internal Governance Notes / Decision Rationale
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="e.g. Verified business address in Koregaon Park and GST active..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#342421]/15">
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#342421] hover:bg-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRetailerDecision}
                disabled={actionInProgress}
                className="px-5 py-2.5 rounded-xl bg-[#342421] text-[#FFF7EB] text-xs font-bold uppercase tracking-wider hover:bg-[#1E1412] disabled:opacity-50 transition-all shadow-[3px_3px_0px_#FF7836]"
              >
                {actionInProgress ? 'Saving Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
