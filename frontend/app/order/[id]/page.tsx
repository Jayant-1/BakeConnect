'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';
import { Order } from '../../../lib/api/types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Truck,
  Package,
  Printer,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building,
  User,
  MapPin,
  RefreshCw,
  ExternalLink,
  Mail,
  Sparkles,
  Store,
  Flame,
} from 'lucide-react';

import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { UpiPaymentModal } from '../../../components/payment/upi-payment-modal';
import { InvoiceModal } from '../../../components/invoice/invoice-modal';

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRedirectingToGateway, setIsRedirectingToGateway] = useState(false);

  const handlePayViaYouPi = async (targetOrder?: Order | null) => {
    const o = targetOrder || order;
    if (!o) return;
    setIsRedirectingToGateway(true);
    try {
      const session = await apiClient.initiatePayment({
        orderId: o.id,
        provider: 'YOUPI_PG',
      });
      const targetUrl = session.checkoutUrl || session.paymentUrl;
      if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('/'))) {
        window.location.href = targetUrl;
        return;
      }
    } catch (err) {
      console.error('Failed to initiate YouPi PG session:', err);
    } finally {
      setIsRedirectingToGateway(false);
    }
    // Fallback to modal if direct gateway URL couldn't be loaded
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && order && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'AUTHORIZED') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('pay') === 'true') {
        handlePayViaYouPi(order);
      }
    }
  }, [order]);

  const fetchOrder = async () => {
    if (!orderId) return;
    try {
      const data = await apiClient.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Failed to fetch order status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    let interval: NodeJS.Timeout | null = null;
    let pollCount = 0;
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('success') === 'true') {
        interval = setInterval(() => {
          pollCount++;
          if (pollCount > 6) {
            if (interval) clearInterval(interval);
            return;
          }
          fetchOrder();
        }, 1500);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrder();
  };

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-xl mx-auto px-4 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-berry-jam border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-crust-muted">Connecting to Spring Boot dispatch server...</p>
        </div>
      </StorefrontLayout>
    );
  }

  if (!order) {
    return (
      <StorefrontLayout>
        <div className="py-24 max-w-xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-cream-subtle flex items-center justify-center text-crust-muted mx-auto mb-4">
            <AlertCircle className="w-8 h-8 opacity-40 text-status-warning" />
          </div>
          <h2 className="font-sans text-xl sm:text-2xl font-bold text-crust-dark mb-2">Order Record Not Found</h2>
          <p className="text-sm text-crust-muted mb-6">
            No active order matching #{orderId} was retrieved from the database.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center font-medium transition-all duration-150 px-5 py-2 text-sm rounded-full min-h-[44px] bg-berry-jam text-cream-base hover:bg-berry-hover shadow-sm"
          >
            Return to Catalog
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-[#15803D] shadow-[2px_2px_0px_#15803D] text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed & Scheduled</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9EB] text-[#B45309] border-2 border-[#B45309] shadow-[2px_2px_0px_#B45309] text-xs font-bold whitespace-nowrap">
            <Flame className="w-3.5 h-3.5 text-[#B45309]" />
            <span>Fresh Oven Baking in Progress</span>
          </span>
        );
      case 'DELAYED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] border-2 border-[#B91C1C] shadow-[2px_2px_0px_#B91C1C] text-xs font-bold whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 text-[#B91C1C]" />
            <span>Delayed by Operations</span>
          </span>
        );
      case 'OUT_FOR_DELIVERY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0E8] text-[#FF7836] border-2 border-[#FF7836] shadow-[2px_2px_0px_#FF7836] text-xs font-bold whitespace-nowrap">
            <Truck className="w-3.5 h-3.5 text-[#FF7836]" />
            <span>Out for Morning Delivery</span>
          </span>
        );
      case 'READY_FOR_PICKUP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E0F2FE] text-[#0369A1] border-2 border-[#0369A1] shadow-[2px_2px_0px_#0369A1] text-xs font-bold whitespace-nowrap">
            <Store className="w-3.5 h-3.5 text-[#0369A1]" />
            <span>Ready at Counter</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-[#15803D] shadow-[2px_2px_0px_#15803D] text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Delivered Successfully</span>
          </span>
        );
      case 'PENDING_REVIEW':
      case 'PENDING':
        return order?.paymentStatus === 'PAID' || order?.paymentStatus === 'AUTHORIZED' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] border-2 border-[#15803D] shadow-[2px_2px_0px_#15803D] text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Payment Verified · In Queue</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border-2 border-[#92400E] shadow-[2px_2px_0px_#92400E] text-xs font-bold whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#92400E]" />
            <span>Awaiting Payment Confirmation</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F6EEE3] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold whitespace-nowrap">
            <span>Pending Bakery Review</span>
          </span>
        );
    }
  };

  const getTimelineEventTitle = (event: { status: string; reasonCode?: string; note?: string }) => {
    const note = (event.note || '').toLowerCase();
    const reason = (event.reasonCode || '').toUpperCase();
    const status = (event.status || '').toUpperCase();

    if (
      reason === 'PAYMENT_OBSERVED' ||
      reason === 'PAYMENT_VERIFIED_SMS' ||
      reason === 'PAYMENT_CONFIRMED' ||
      reason === 'PAYMENT_RECONCILED_STATEMENT' ||
      note.includes('payment observed') ||
      note.includes('payment verified') ||
      note.includes('payment confirmed') ||
      note.includes('utr:')
    ) {
      return 'Payment Received & Verified';
    }
    if (
      reason === 'ORDER_CREATED' ||
      note.includes('order submitted') ||
      note.includes('order received') ||
      note.includes('order placed')
    ) {
      return 'Order Placed';
    }
    if (status === 'CONFIRMED' || note.includes('confirmed') || note.includes('scheduled')) {
      return 'Fresh Bakery Batch Scheduled';
    }
    if (status === 'PROCESSING' || note.includes('baking') || note.includes('oven')) {
      return 'Baking in Fresh Oven';
    }
    if (status === 'OUT_FOR_DELIVERY' || note.includes('out for delivery')) {
      return 'Out for Morning Delivery';
    }
    if (status === 'READY_FOR_PICKUP' || note.includes('pickup')) {
      return 'Ready for Counter Pickup';
    }
    if (status === 'DELIVERED' || note.includes('delivered')) {
      return 'Delivered Successfully';
    }
    if (status === 'DELAYED' || note.includes('rescheduled') || note.includes('delay')) {
      return 'Dispatch Schedule Update';
    }
    if (status === 'PENDING' || status === 'PENDING_REVIEW') {
      return 'Order Placed';
    }
    return status.replace(/_/g, ' ');
  };

  return (
    <StorefrontLayout>
      <div className="py-8 sm:py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-1.5 text-xs text-[#342421]/70 hover:text-[#FF7836] font-bold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Orders</span>
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 text-xs text-[#342421]/70 hover:text-[#FF7836] font-bold uppercase tracking-wider transition-colors"
          >
            <span>Browse Fresh Bakes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Craftsman Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF7EB] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold font-mono tracking-wide whitespace-nowrap">
                <span className="text-[#FF7836] font-bold">ORDER</span>
                <span>#{order.orderNumber}</span>
              </span>
              {getStatusBadge(order.status)}
              {order.orderType === 'BUSINESS' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9EAF3] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold whitespace-nowrap">
                  <Store className="w-3.5 h-3.5 text-[#548FA8]" />
                  <span>Wholesale Dispatch</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9EAF3] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold whitespace-nowrap">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7836]" />
                  <span>Daily Bakery Order</span>
                </span>
              )}
            </div>

            <h1 className="font-sans text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#342421] leading-tight">
              {order.status === 'CONFIRMED' || order.status === 'PROCESSING'
                ? 'Your Fresh Bakery Batch is Scheduled'
                : order.status === 'DELAYED'
                ? 'Order Schedule Update from Bakery'
                : 'Order Status & Live Timeline'}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#342421]/75 font-medium">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FF7836]" />
                <span>Placed <span suppressHydrationWarning>{formatDate(order.createdAt)}</span></span>
              </div>
              <span className="hidden sm:inline text-[#342421]/30">•</span>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#548FA8]" />
                <span>Confirmation to <strong className="text-[#342421] font-semibold">{order.customerEmail}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#342421]/10">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-white text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#F6EEE3] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all whitespace-nowrap disabled:opacity-50 cursor-pointer"
              title="Refresh order and payment status"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#342421] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#FF7836] text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#E86322] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all whitespace-nowrap cursor-pointer"
              title="View and print official GST invoice"
            >
              <Printer className="w-3.5 h-3.5 text-[#342421]" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

      {/* Payment Required Action Alert for UPI Orders (PENDING) */}
      {order.paymentStatus === 'PENDING' && order.paymentMethod === 'YOUPI_PG' && (
        <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[3px_3px_0px_#342421] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans text-base sm:text-lg font-bold text-[#342421] tracking-tight">
                  UPI Payment Awaiting Confirmation
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold border border-amber-300">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-[#342421]/75 mt-1 max-w-xl leading-relaxed">
                Scan the dynamic verification QR code with any UPI app to confirm your order. Includes a nominal verification fee for instant bank matching.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="default"
            onClick={() => handlePayViaYouPi(order)}
            disabled={isRedirectingToGateway}
            className="rounded-full px-5 py-2.5 font-bold shadow-[3px_3px_0px_#342421] shrink-0 flex items-center gap-2"
          >
            {isRedirectingToGateway ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Opening Gateway...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay via UPI ({formatCurrency(order.totalAmount)})</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Payment Observed & Authorized Banner (AUTHORIZED or PAID) */}
      {(order.paymentStatus === 'AUTHORIZED' || order.paymentStatus === 'PAID') && (
        <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-[#F0FDF4] border-2 border-[#15803D] shadow-[3px_3px_0px_#15803D] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] text-white border-2 border-[#15803D] shadow-[2px_2px_0px_#15803D] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-sans text-base sm:text-lg font-bold text-[#14532D] tracking-tight">
                  UPI Payment Verified · Batch Scheduled
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-300">
                  Payment Received
                </span>
              </div>
              <p className="text-xs text-[#166534] mt-1 max-w-xl leading-relaxed font-medium">
                Your UPI transaction was successfully received and verified by our automated banking observer. Your order is confirmed in the bakery schedule.
              </p>
            </div>
          </div>
          <Badge variant="success" className="px-3.5 py-1.5 font-semibold text-xs shrink-0">
            Payment Verified
          </Badge>
        </div>
      )}

      {/* Delayed Notice Alert (if applicable) */}
      {order.status === 'DELAYED' && (
        <div className="mb-8 p-5 rounded-2xl bg-status-warning-bg border border-status-warning/40 text-xs text-status-warning space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-status-warning" />
            <span>Dispatch Rescheduled: {order.delayPreset?.replace('_', ' ') || 'Operational Adjustment'}</span>
          </div>
          <p className="text-crust-dark/80">
            {order.delayReason ||
              'Our head baker rescheduled this batch due to morning bakery oven capacity. A revised dispatch confirmation was sent to your email.'}
          </p>
          {order.estimatedDeliveryDate && (
            <div className="font-semibold text-crust-dark pt-1">
              New Estimated Delivery: <span suppressHydrationWarning>{formatDate(order.estimatedDeliveryDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Live Timeline & Order Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Authoritative Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-6">
          <h2 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#342421] pb-3 border-b-2 border-[#342421]/15 flex items-center justify-between">
            <span>Authoritative Fulfillment Timeline</span>
            <span className="text-xs font-bold text-[#342421]/60 uppercase tracking-wider">Live Updates</span>
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#342421]/20">
            {order.timeline.map((event, idx) => (
              <div key={idx} className="relative">
                {/* Timeline node */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${
                    getTimelineEventTitle(event) === 'Payment Received & Verified' || event.status === 'CONFIRMED'
                      ? 'border-[#15803D] text-[#15803D] shadow-xs'
                      : idx === order.timeline.length - 1
                      ? 'border-[#FF7836] text-[#FF7836] shadow-xs'
                      : 'border-[#15803D] text-[#15803D]'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      getTimelineEventTitle(event) === 'Payment Received & Verified' || event.status === 'CONFIRMED'
                        ? 'bg-[#15803D]'
                        : idx === order.timeline.length - 1
                        ? 'bg-[#FF7836]'
                        : 'bg-[#15803D]'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-[#342421]">
                      {getTimelineEventTitle(event)}
                    </span>
                    <span suppressHydrationWarning className="text-[11px] text-[#342421]/60 font-mono font-medium">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-xs text-[#342421]/75 mt-1 leading-relaxed">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Destination Box */}
          {order.shippingAddress && (
            <div className="pt-6 border-t-2 border-[#342421]/15 space-y-2.5">
              <h3 className="text-xs uppercase tracking-wider font-bold text-[#342421]/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF7836]" />
                <span>Destination Coordinates</span>
              </h3>
              <div className="p-4 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs text-[#342421] leading-relaxed space-y-1">
                <div className="font-bold text-sm text-[#342421]">{order.shippingAddress.contactName} ({order.shippingAddress.contactPhone})</div>
                <div>{order.shippingAddress.addressLine1}, {order.shippingAddress.addressLine2}</div>
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</div>
                {order.shippingAddress.deliveryInstructions && (
                  <div className="text-[#342421]/70 mt-1 italic font-medium">
                    Note: &quot;{order.shippingAddress.deliveryInstructions}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invoice Items & Pricing (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#342421] shadow-[4px_4px_0px_#342421] space-y-6">
          <h2 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-[#342421] pb-3 border-b-2 border-[#342421]/15">
            Line Items ({order.items.length})
          </h2>

          <div className="divide-y-2 divide-[#342421]/10 text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center">
                <div className="pr-3">
                  <div className="font-bold text-[#342421]">{item.productName}</div>
                  <div className="text-[#342421]/60">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="font-bold text-[#342421]">{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t-2 border-[#342421]/15 text-xs text-[#342421]/70">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-[#342421]">{formatCurrency(order.subtotal)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-[#FF7836] font-semibold">
                <span>Discounts ({order.appliedDiscountName || 'Applied'})</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Bakery GST (5%)</span>
              <span className="font-semibold text-[#342421]">{formatCurrency(order.taxAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Fulfillment ({order.fulfillmentType})</span>
              <span className="font-semibold text-[#342421]">
                {order.deliveryFee === 0 ? (
                  <span className="text-[#15803D] font-bold">FREE</span>
                ) : (
                  formatCurrency(order.deliveryFee)
                )}
              </span>
            </div>

            <div className="pt-3 border-t-2 border-[#342421]/15 flex justify-between text-lg font-extrabold text-[#342421]">
              <span>Authoritative Total</span>
              <span className="text-[#FF7836]">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[#342421]/70 font-medium">Payment Method:</span>
                <span className="font-bold text-[#342421] flex items-center gap-1.5">
                  {order.paymentMethod === 'CREDIT_CYCLE' ? (
                    'Net-15 Invoice Cycle'
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-[#FF7836]" />
                      <span>UPI Instant Pay</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#342421]/70 font-medium">Payment Status:</span>
                {order.paymentStatus === 'PAID' || order.paymentStatus === 'AUTHORIZED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#15803D]/40">
                    <CheckCircle2 className="w-3 h-3 text-[#15803D]" />
                    <span>PAID</span>
                  </span>
                ) : order.paymentStatus === 'FAILED' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    <span>FAILED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#92400E]/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                    <span>PENDING</span>
                  </span>
                )}
              </div>

              {order.businessGst && (
                <div className="flex justify-between items-center pt-1.5 border-t border-[#342421]/15">
                  <span className="text-[#342421]/70 font-medium">GSTIN:</span>
                  <span className="font-mono font-bold text-[#342421]">{order.businessGst}</span>
                </div>
              )}
            </div>

            {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'AUTHORIZED' && order.paymentMethod === 'YOUPI_PG' && (
              <div className="mt-3.5 pt-3.5 border-t-2 border-[#342421]/15">
                <button
                  type="button"
                  onClick={() => handlePayViaYouPi(order)}
                  disabled={isRedirectingToGateway}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-[#342421] bg-[#FF7836] hover:bg-[#FF6A1F] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isRedirectingToGateway ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Opening Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Pay via YOUPI PG &middot; {formatCurrency(order.totalAmount)}</span>
                      <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#342421]/60 text-center mt-1.5 font-medium">
                  Instant QR &bull; 256-Bit Bank Verification
                </p>
              </div>
            )}
          </div>

          <Link
            href={order.orderType === 'BUSINESS' ? '/retailer' : '/shop'}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider bg-white text-[#342421] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] hover:bg-[#F6EEE3] hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            <span>{order.orderType === 'BUSINESS' ? 'Return to Wholesale Desk' : 'Order More Fresh Bakes'}</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>
      </div>

      <UpiPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
        baseAmount={order.totalAmount}
        onPaymentSuccess={() => {
          setIsPaymentModalOpen(false);
          fetchOrder();
        }}
      />

      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        order={order}
        orderId={order.id}
      />
    </StorefrontLayout>
  );
}
