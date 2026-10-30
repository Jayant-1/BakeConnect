'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';
import { Order, OrderStatus } from '../../../lib/api/types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  ArrowLeft,
  X,
  FileText,
  Filter,
} from 'lucide-react';

export default function AdminOrdersReviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeModalOrder, setActiveModalOrder] = useState<Order | null>(null);

  // Review Dialog State
  const [actionType, setActionType] = useState<'APPROVE' | 'DELAY' | 'DECLINE' | null>(null);
  const [delayPreset, setDelayPreset] = useState<'PEAK_WORKLOAD' | 'STAFF_SHORTAGE' | 'MATERIAL_SHORTAGE' | 'WEATHER' | 'OTHER'>('PEAK_WORKLOAD');
  const [delayReason, setDelayReason] = useState('');
  const [newDeliveryDate, setNewDeliveryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders =
    selectedStatus === 'ALL'
      ? orders
      : orders.filter((o) => o.status === selectedStatus);

  const handleOpenReview = (order: Order) => {
    setActiveModalOrder(order);
    setActionType(null);
    setDelayReason('');
    setActionSuccessMsg(null);
  };

  const handleExecuteReview = async () => {
    if (!activeModalOrder || !actionType) return;
    setIsSubmitting(true);

    try {
      let targetStatus: OrderStatus = 'CONFIRMED';
      if (actionType === 'DELAY') targetStatus = 'DELAYED';
      if (actionType === 'DECLINE') targetStatus = 'CANCELLED';

      const updated = await apiClient.updateOrderStatus(activeModalOrder.id, {
        status: targetStatus,
        preset: actionType === 'DELAY' ? delayPreset : undefined,
        reason: delayReason,
        newDeliveryDate: newDeliveryDate || undefined,
      });

      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      setActionSuccessMsg(`Order #${updated.orderNumber} successfully set to ${targetStatus}. Notification sent.`);
      setTimeout(() => {
        setActiveModalOrder(null);
        setActionType(null);
      }, 1500);
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-crust-muted hover:text-berry-jam mb-2 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-crust-dark">
            Order Review & Dispatch Operations
          </h1>
          <p className="text-xs text-crust-muted mt-1">
            Authoritative approval, delay rescheduling, and decline actions with preset reasons.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-cream-surface border border-cream-border p-1 rounded-full text-xs font-semibold overflow-x-auto">
          {['ALL', 'PENDING', 'CONFIRMED', 'DELAYED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-full transition-all ${
                selectedStatus === st
                  ? 'bg-crust-dark text-cream-base shadow-xs'
                  : 'text-crust-muted hover:text-crust-dark'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-status-success-bg border border-status-success/30 text-xs text-status-success font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-cream-surface rounded-3xl border border-cream-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream-base/80 border-b border-cream-border text-crust-muted uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-6">Order Ref</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Customer / Partner</th>
                <th className="py-3.5 px-4">Summary</th>
                <th className="py-3.5 px-4 text-right">Total Payable</th>
                <th className="py-3.5 px-4 text-center">Current Status</th>
                <th className="py-3.5 px-6 text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border/60 text-crust-dark">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-cream-subtle/30 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold">
                    #{order.orderNumber}
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant={order.orderType === 'BUSINESS' ? 'sea' : 'default'}>
                      {order.orderType === 'BUSINESS' ? 'B2B Wholesale' : 'B2C Retail'}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold">{order.businessName || order.customerName}</div>
                    <div className="text-[10px] text-crust-muted">{order.customerEmail}</div>
                  </td>
                  <td className="py-4 px-4 text-crust-muted">
                    {order.items.length} SKUs ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
                  </td>
                  <td className="py-4 px-4 text-right font-bold font-mono">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge
                      variant={
                        order.status === 'CONFIRMED'
                          ? 'success'
                          : order.status === 'DELAYED'
                          ? 'warning'
                          : order.status === 'CANCELLED'
                          ? 'error'
                          : 'default'
                      }
                    >
                      {order.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenReview(order)}
                      className="rounded-full px-3 text-xs font-semibold"
                    >
                      Review Order
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Operations Modal */}
      {activeModalOrder && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-crust-dark/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-cream-surface rounded-3xl border border-cream-border max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModalOrder(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-crust-muted hover:bg-cream-subtle"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider text-crust-muted font-bold">
                  Order #{activeModalOrder.orderNumber}
                </span>
                <Badge variant={activeModalOrder.orderType === 'BUSINESS' ? 'sea' : 'default'}>
                  {activeModalOrder.orderType}
                </Badge>
              </div>
              <h2 className="font-display text-2xl font-bold text-crust-dark">
                Operational Review & Dispatch
              </h2>
              <p className="text-xs text-crust-muted mt-1">
                Customer: <strong>{activeModalOrder.customerName}</strong> • Subtotal: <strong>{formatCurrency(activeModalOrder.totalAmount)}</strong>
              </p>
            </div>

            {/* 3 Explicit Action Buttons */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-crust-dark block">
                Select Dispatch Action
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionType('APPROVE')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    actionType === 'APPROVE'
                      ? 'border-status-success bg-status-success-bg text-status-success font-bold ring-2 ring-status-success/30'
                      : 'border-cream-border bg-cream-base hover:bg-cream-subtle text-crust-dark'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-status-success" />
                  <span className="text-xs">Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('DELAY')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    actionType === 'DELAY'
                      ? 'border-status-warning bg-status-warning-bg text-status-warning font-bold ring-2 ring-status-warning/30'
                      : 'border-cream-border bg-cream-base hover:bg-cream-subtle text-crust-dark'
                  }`}
                >
                  <Clock className="w-5 h-5 mx-auto mb-1 text-status-warning" />
                  <span className="text-xs">Delay Order</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('DECLINE')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    actionType === 'DECLINE'
                      ? 'border-status-error bg-status-error-bg text-status-error font-bold ring-2 ring-status-error/30'
                      : 'border-cream-border bg-cream-base hover:bg-cream-subtle text-crust-dark'
                  }`}
                >
                  <XCircle className="w-5 h-5 mx-auto mb-1 text-status-error" />
                  <span className="text-xs">Decline</span>
                </button>
              </div>
            </div>

            {/* Reason presets when Delay is selected */}
            {actionType === 'DELAY' && (
              <div className="p-4 rounded-2xl bg-cream-base border border-cream-border space-y-3">
                <label className="text-xs font-semibold text-crust-dark block">
                  Select Delay Reason Preset *
                </label>
                <select
                  value={delayPreset}
                  onChange={(e) => setDelayPreset(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-cream-border bg-cream-surface text-xs text-crust-dark focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="PEAK_WORKLOAD">Peak Stone Hearth Workload</option>
                  <option value="STAFF_SHORTAGE">Bakery Staffing / Proofing Delay</option>
                  <option value="MATERIAL_SHORTAGE">Organic Heritage Grain Supply Delay</option>
                  <option value="WEATHER">Logistics / Weather Disruption</option>
                  <option value="OTHER">Other Operational Adjustment</option>
                </select>

                <div>
                  <label className="text-xs font-semibold text-crust-dark block mb-1">
                    Customer Notice Message
                  </label>
                  <textarea
                    rows={2}
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="Explain rescheduling to the customer (sent via email)..."
                    className="w-full p-2.5 rounded-xl border border-cream-border bg-cream-surface text-xs text-crust-dark placeholder:text-crust-faint focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>
            )}

            {actionType === 'DECLINE' && (
              <div className="p-4 rounded-2xl bg-status-error-bg/30 border border-status-error/30 space-y-2">
                <label className="text-xs font-semibold text-status-error block">
                  Decline Reason (Sent via Email)
                </label>
                <textarea
                  rows={2}
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. Sourdough culture batch exhausted for today..."
                  className="w-full p-2.5 rounded-xl border border-status-error/40 bg-cream-surface text-xs text-crust-dark focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="pt-2 flex justify-end gap-3">
              <Button
                variant="secondary"
                size="default"
                onClick={() => setActiveModalOrder(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="default"
                disabled={!actionType || isSubmitting}
                isLoading={isSubmitting}
                onClick={handleExecuteReview}
              >
                Execute Action & Notify
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
