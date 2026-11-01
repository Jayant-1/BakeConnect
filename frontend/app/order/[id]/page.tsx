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
  ShieldCheck,
  Building,
  User,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { UpiPaymentModal } from '../../../components/payment/upi-payment-modal';

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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
    if (typeof window !== 'undefined' && order && order.paymentStatus !== 'PAID') {
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
          <h2 className="font-display text-2xl font-semibold text-crust-dark mb-2">Order Record Not Found</h2>
          <p className="text-sm text-crust-muted mb-6">
            No active order matching #{orderId} was retrieved from the database.
          </p>
          <Link href="/shop">
            <Button variant="primary">Return to Catalog</Button>
          </Link>
        </div>
      </StorefrontLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed & Scheduled</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning">Hearth Baking in Progress</Badge>;
      case 'DELAYED':
        return <Badge variant="error">Delayed by Operations</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge variant="info">Out for Morning Delivery</Badge>;
      case 'DELIVERED':
        return <Badge variant="success">Delivered</Badge>;
      default:
        return <Badge variant="default">Pending Bakery Review</Badge>;
    }
  };

  return (
    <StorefrontLayout>
      <div className="py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="bg-cream-surface rounded-3xl p-6 sm:p-8 border border-cream-border shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs uppercase tracking-widest text-crust-muted font-bold">
              Order #{order.orderNumber}
            </span>
            {getStatusBadge(order.status)}
            <Badge variant={order.orderType === 'BUSINESS' ? 'sea' : 'default'}>
              {order.orderType === 'BUSINESS' ? 'Wholesale Dispatch' : 'Daily Bakery Order'}
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-crust-dark">
            {order.status === 'CONFIRMED' || order.status === 'PROCESSING'
              ? 'Your Hearth Batch is Scheduled'
              : order.status === 'DELAYED'
              ? 'Order Schedule Update from Bakery'
              : 'Order Status & Live Timeline'}
          </h1>
          <p className="text-xs text-crust-muted mt-1">
            Placed on {formatDate(order.createdAt)} • Email confirmation sent to{' '}
            <strong className="text-crust-dark">{order.customerEmail}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Invoice</span>
          </Button>
        </div>
      </div>

      {/* Payment Required Action Alert for UPI Orders */}
      {order.paymentStatus !== 'PAID' && order.paymentMethod === 'YOUPI_PG' && (
        <div className="mb-8 p-6 rounded-3xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg uppercase font-bold text-[#342421]">
                  UPI Payment Awaiting Confirmation
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-[#342421]/70 mt-1 max-w-xl">
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

      {/* Delayed Notice Alert (if applicable) */}
      {order.status === 'DELAYED' && (
        <div className="mb-8 p-5 rounded-2xl bg-status-warning-bg border border-status-warning/40 text-xs text-status-warning space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-status-warning" />
            <span>Dispatch Rescheduled: {order.delayPreset?.replace('_', ' ') || 'Operational Adjustment'}</span>
          </div>
          <p className="text-crust-dark/80">
            {order.delayReason ||
              'Our head baker rescheduled this batch due to morning stone hearth capacity. A revised dispatch confirmation was sent to your email.'}
          </p>
          {order.estimatedDeliveryDate && (
            <div className="font-semibold text-crust-dark pt-1">
              New Estimated Delivery: {formatDate(order.estimatedDeliveryDate)}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Live Timeline & Order Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Authoritative Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-cream-surface rounded-3xl p-6 sm:p-8 border border-cream-border shadow-xs space-y-6">
          <h2 className="font-display text-xl font-semibold text-crust-dark pb-3 border-b border-cream-border flex items-center justify-between">
            <span>Authoritative Fulfillment Timeline</span>
            <span className="text-xs font-normal text-crust-muted">Updated via Spring Boot</span>
          </h2>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-cream-border">
            {order.timeline.map((event, idx) => (
              <div key={idx} className="relative">
                {/* Timeline node */}
                <div
                  className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-cream-surface ${
                    idx === order.timeline.length - 1
                      ? 'border-berry-jam text-berry-jam shadow-xs'
                      : 'border-status-success text-status-success'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      idx === order.timeline.length - 1 ? 'bg-berry-jam' : 'bg-status-success'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-crust-dark">
                      {event.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-crust-muted font-mono">
                      {formatDate(event.timestamp)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-xs text-crust-muted mt-1 leading-relaxed">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Delivery Destination Box */}
          {order.shippingAddress && (
            <div className="pt-6 border-t border-cream-border space-y-2">
              <h3 className="text-xs uppercase tracking-wider font-bold text-crust-muted flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-berry-jam" />
                <span>Destination Coordinates</span>
              </h3>
              <div className="text-xs text-crust-dark leading-relaxed">
                <div className="font-bold">{order.shippingAddress.contactName} ({order.shippingAddress.contactPhone})</div>
                <div>{order.shippingAddress.addressLine1}, {order.shippingAddress.addressLine2}</div>
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</div>
                {order.shippingAddress.deliveryInstructions && (
                  <div className="text-crust-muted mt-1 italic">
                    Note: &quot;{order.shippingAddress.deliveryInstructions}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Invoice Items & Pricing (5 cols) */}
        <div className="lg:col-span-5 bg-cream-surface rounded-3xl p-6 sm:p-8 border border-cream-border shadow-xs space-y-6">
          <h2 className="font-display text-xl font-semibold text-crust-dark pb-3 border-b border-cream-border">
            Line Items ({order.items.length})
          </h2>

          <div className="divide-y divide-cream-border/60 text-xs">
            {order.items.map((item) => (
              <div key={item.id} className="py-3 flex justify-between items-center">
                <div className="pr-3">
                  <div className="font-bold text-crust-dark">{item.productName}</div>
                  <div className="text-crust-muted">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </div>
                </div>
                <div className="font-bold text-crust-dark">{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4 border-t border-cream-border text-xs text-crust-muted">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-crust-dark">{formatCurrency(order.subtotal)}</span>
            </div>

            {order.discountAmount > 0 && (
              <div className="flex justify-between text-berry-jam font-semibold">
                <span>Discounts ({order.appliedDiscountName || 'Applied'})</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Bakery GST (5%)</span>
              <span className="font-semibold text-crust-dark">{formatCurrency(order.taxAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span>Fulfillment ({order.fulfillmentType})</span>
              <span className="font-semibold text-crust-dark">
                {order.deliveryFee === 0 ? (
                  <span className="text-status-success font-bold">FREE</span>
                ) : (
                  formatCurrency(order.deliveryFee)
                )}
              </span>
            </div>

            <div className="pt-3 border-t border-cream-border flex justify-between text-lg font-bold text-crust-dark">
              <span>Authoritative Total</span>
              <span className="text-berry-jam">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-cream-base border border-cream-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-crust-muted">Payment Method:</span>
              <span className="font-bold text-crust-dark">
                {order.paymentMethod === 'CREDIT_CYCLE' ? 'Net-15 Invoice Cycle' : 'UPI'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-crust-muted">Payment Status:</span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold ${
                    order.paymentStatus === 'PAID'
                      ? 'text-status-success'
                      : 'text-status-warning'
                  }`}
                >
                  {order.paymentStatus}
                </span>
                {order.paymentStatus !== 'PAID' && order.paymentMethod === 'YOUPI_PG' && (
                  <button
                    type="button"
                    onClick={() => handlePayViaYouPi(order)}
                    disabled={isRedirectingToGateway}
                    className="text-xs bg-[#FF7836] text-white hover:bg-[#FF6A1F] font-bold px-3 py-1 rounded-full border border-[#342421] shadow-[1px_1px_0px_#342421] transition-all flex items-center gap-1.5"
                  >
                    {isRedirectingToGateway ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Opening Gateway...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay via YOUPI PG</span>
                        <ExternalLink className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            {order.businessGst && (
              <div className="flex justify-between pt-1">
                <span className="text-crust-muted">GSTIN:</span>
                <span className="font-mono text-crust-dark">{order.businessGst}</span>
              </div>
            )}
          </div>

          <Link href={order.orderType === 'BUSINESS' ? '/retailer' : '/shop'} className="block">
            <Button variant="secondary" size="default" className="w-full justify-center">
              <span>{order.orderType === 'BUSINESS' ? 'Return to Wholesale Desk' : 'Order More Fresh Bakes'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
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
    </StorefrontLayout>
  );
}
