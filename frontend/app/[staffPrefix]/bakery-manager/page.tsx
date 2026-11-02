'use client';

import React, { useState, useEffect, use } from 'react';
import { notFound } from 'next/navigation';
import { useAuth } from '../../../lib/store/auth-context';
import { getApiBase } from '../../../lib/api/backend-client';
import { formatCurrency } from '../../../lib/utils';
import {
  ChefHat,
  ShoppingBag,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  CreditCard,
  MessageSquare,
  Search,
  Plus,
  Send,
  Eye,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  orderType: 'PERSONAL' | 'BUSINESS';
  status: string;
  paymentStatus: string;
  totalAmount: number;
  customerName: string;
  customerPhone?: string;
  deliveryType: string;
  deliveryAddress?: string;
  createdAt: string;
  items: OrderItem[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  categoryName?: string;
  stockQuantity: number;
  retailPrice: number;
  wholesalePrice: number;
  moq: number;
  unitOfMeasure: string;
  packDetails?: string;
  isAvailable: boolean;
}

interface AuditLog {
  id: string;
  productName: string;
  adjustedByName: string;
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reasonCode: string;
  notes?: string;
  createdAt: string;
}

interface CustomerIssue {
  id: string;
  userName: string;
  userEmail: string;
  orderId?: string;
  category: string;
  shortDescription: string;
  status: string;
  assignedToName?: string;
  resolutionNotes?: string;
  createdAt: string;
  messages: Array<{
    id: string;
    senderName: string;
    senderRole: string;
    message: string;
    isInternalNote: boolean;
    createdAt: string;
  }>;
}

export default function BakeryManagerPage({
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

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'prep' | 'inventory' | 'payments' | 'issues'>('queue');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Inventory State
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockQty, setNewStockQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('RESTOCK_BATCH');
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('');

  // Offline Payment State
  const [payOrderId, setPayOrderId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payReference, setPayReference] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [payFeedback, setPayFeedback] = useState<string | null>(null);

  // Customer Issues State
  const [issues, setIssues] = useState<CustomerIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<CustomerIssue | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);

  const getAuthToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('bakeconnect_token_v1') : null;
  };

  const API_BASE = getApiBase();

  const loadData = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      // 1. Fetch Orders
      const ordersRes = await fetch(`${API_BASE}/api/v1/manager/orders?size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        if (json.success && json.data?.content) {
          setOrders(json.data.content);
        }
      }

      // 2. Fetch Products
      const prodRes = await fetch(`${API_BASE}/api/v1/manager/products?size=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (prodRes.ok) {
        const json = await prodRes.json();
        if (json.success && json.data?.content) {
          setProducts(json.data.content);
        }
      }

      // 3. Fetch Audit Logs
      const auditRes = await fetch(`${API_BASE}/api/v1/manager/inventory/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (auditRes.ok) {
        const json = await auditRes.json();
        if (json.success && Array.isArray(json.data)) {
          setAuditLogs(json.data);
        }
      }

      // 4. Fetch Issues
      const issuesRes = await fetch(`${API_BASE}/api/v1/manager/issues?size=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (issuesRes.ok) {
        const json = await issuesRes.json();
        if (json.success && json.data?.content) {
          setIssues(json.data.content);
        }
      }
    } catch (err) {
      console.error('Failed to load manager dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Status transition handler
  const handleTransitionStatus = async (orderId: string, newStatus: string) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/manager/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          reasonCode: 'MANAGER_DISPATCH',
          customerMessage: `Order status advanced to ${newStatus}`,
        }),
      });

      if (res.ok) {
        await loadData();
      } else {
        const errorJson = await res.json();
        alert(errorJson.message || 'Illegal state transition for this order');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating order status');
    }
  };

  // Stock adjustment handler
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/manager/products/${adjustingProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newQuantity: Number(newStockQty),
          reasonCode: adjustmentReason,
          notes: adjustmentNotes,
        }),
      });

      if (res.ok) {
        setAdjustingProduct(null);
        setAdjustmentNotes('');
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to adjust stock');
      }
    } catch (err: any) {
      alert(err.message || 'Stock adjustment network error');
    }
  };

  // Offline Payment recording handler
  const handleRecordOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/manager/payments/offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: payOrderId.trim() || null,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          referenceNumber: payReference.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });

      if (res.ok) {
        setPayFeedback('Payment recorded successfully and order updated!');
        setPayOrderId('');
        setPayAmount('');
        setPayReference('');
        setPayNotes('');
        await loadData();
        setTimeout(() => setPayFeedback(null), 4000);
      } else {
        const err = await res.json();
        setPayFeedback(`Failed: ${err.message || 'Unable to record offline payment'}`);
      }
    } catch (err: any) {
      setPayFeedback(`Error: ${err.message}`);
    }
  };

  // Reply to customer issue
  const handleSendIssueReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !replyMessage.trim()) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/manager/issues/${selectedIssue.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: replyMessage.trim(),
          isInternalNote: isInternalNote,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSelectedIssue(json.data);
        setReplyMessage('');
        await loadData();
      }
    } catch {
      alert('Failed to send message');
    }
  };

  // Resolve issue
  const handleResolveIssue = async () => {
    if (!selectedIssue) return;
    const token = getAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/manager/issues/${selectedIssue.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNotes: resolutionNotes || 'Resolved by bakery manager.',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setSelectedIssue(json.data);
        setResolutionNotes('');
        await loadData();
      }
    } catch {
      alert('Failed to resolve issue');
    }
  };

  // Derived counts for "What Needs Attention Now"
  const pendingOrders = orders.filter((o) => o.status === 'PENDING_REVIEW' || o.status === 'CONFIRMED');
  const inPrepOrders = orders.filter((o) => o.status === 'PROCESSING');
  const readyOrders = orders.filter((o) => o.status === 'READY_FOR_PICKUP' || o.status === 'OUT_FOR_DELIVERY');
  const lowStockProducts = products.filter((p) => p.stockQuantity < 25);
  const openIssues = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');

  // Aggregate Preparation List across active pending & processing orders
  const prepList = React.useMemo(() => {
    const map = new Map<string, { name: string; quantity: number }>();
    orders
      .filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING')
      .forEach((order) => {
        order.items?.forEach((item) => {
          const current = map.get(item.productName) || { name: item.productName, quantity: 0 };
          current.quantity += item.quantity;
          map.set(item.productName, current);
        });
      });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-[#342421]/15">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#342421]/70">
              Live Bakery Production Deck
            </span>
          </div>
          <h1 className="font-display uppercase text-3xl sm:text-4xl font-black text-[#342421] tracking-tight">
            WHAT NEEDS ATTENTION NOW
          </h1>
          <p className="text-xs text-[#342421]/70 font-medium mt-1">
            Pune oven batches, preparation quotas, order dispatches, and stock audit trails
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-1.5 bg-[#FFF7EB] p-1.5 rounded-2xl border-2 border-[#342421] shadow-[3px_3px_0px_#342421]">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'queue'
                ? 'bg-[#342421] text-white shadow-xs'
                : 'text-[#342421] hover:bg-white/60'
            }`}
          >
            Fulfillment Queue ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('prep')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'prep'
                ? 'bg-[#FF7836] text-white shadow-xs'
                : 'text-[#342421] hover:bg-white/60'
            }`}
          >
            Bake & Prep List ({prepList.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#342421] text-white shadow-xs'
                : 'text-[#342421] hover:bg-white/60'
            }`}
          >
            Inventory & Audits ({lowStockProducts.length} low)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'payments'
                ? 'bg-[#342421] text-white shadow-xs'
                : 'text-[#342421] hover:bg-white/60'
            }`}
          >
            Record Offline Pay
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'issues'
                ? 'bg-[#FF7836] text-white shadow-xs'
                : 'text-[#342421] hover:bg-white/60'
            }`}
          >
            Customer Tickets ({openIssues.length})
          </button>
        </div>
      </div>

      {/* 2. "What Needs Attention Now" Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#342421]/60 mb-2">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-display text-4xl font-extrabold text-[#342421]">
            {pendingOrders.length}
          </div>
          <span className="text-[11px] font-semibold text-amber-700 mt-1 block">
            Awaiting confirmation or payment
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#342421]/60 mb-2">
            <span>Baking / In Oven</span>
            <ChefHat className="w-4 h-4 text-[#FF7836]" />
          </div>
          <div className="font-display text-4xl font-extrabold text-[#FF7836]">
            {inPrepOrders.length}
          </div>
          <span className="text-[11px] font-semibold text-[#342421]/70 mt-1 block">
            Currently on baking trays
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#342421]/60 mb-2">
            <span>Ready / Dispatch</span>
            <Truck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="font-display text-4xl font-extrabold text-emerald-700">
            {readyOrders.length}
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 mt-1 block">
            Ready for pickup or out on road
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-[#342421]/60 mb-2">
            <span>Open Issues</span>
            <MessageSquare className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-display text-4xl font-extrabold text-rose-700">
            {openIssues.length}
          </div>
          <span className="text-[11px] font-semibold text-rose-800 mt-1 block">
            Requires staff reply or resolution
          </span>
        </div>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: ORDER FULFILLMENT QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Status Filter Bar */}
          <div className="flex flex-wrap gap-2 items-center">
            {['ALL', 'PENDING_REVIEW', 'CONFIRMED', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setOrderFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border-2 border-[#342421] transition-all ${
                  orderFilter === st
                    ? 'bg-[#342421] text-white shadow-[2px_2px_0px_#342421]'
                    : 'bg-white text-[#342421] hover:bg-[#FDF4E3]'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#342421] text-white uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#342421]/10 font-semibold">
                  {orders
                    .filter((o) => orderFilter === 'ALL' || o.status === orderFilter)
                    .map((order) => (
                      <tr key={order.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-[#342421]">
                          {order.orderNumber}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              order.orderType === 'BUSINESS'
                                ? 'bg-[#D9EAF3] text-[#342421] border border-[#342421]'
                                : 'bg-[#FF7836]/20 text-[#342421] border border-[#FF7836]'
                            }`}
                          >
                            {order.orderType === 'BUSINESS' ? 'Wholesale' : 'Retail'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#342421]">{order.customerName || 'Customer'}</div>
                          {order.deliveryType === 'DELIVERY' ? (
                            <span className="text-[10px] text-emerald-800 flex items-center gap-1 font-semibold">
                              <Truck className="w-3 h-3" /> Delivery
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-800 font-semibold">Counter Pickup</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {order.items?.length || 0} items
                        </td>
                        <td className="py-4 px-4 font-bold text-[#342421]">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-[#342421] uppercase text-[11px]">
                            {order.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {order.status === 'PENDING_REVIEW' && (
                              <button
                                onClick={() => handleTransitionStatus(order.id, 'CONFIRMED')}
                                className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 shadow-xs"
                              >
                                Confirm
                              </button>
                            )}
                            {order.status === 'CONFIRMED' && (
                              <button
                                onClick={() => handleTransitionStatus(order.id, 'PROCESSING')}
                                className="px-2.5 py-1 rounded-full bg-[#FF7836] text-white text-[11px] font-bold hover:bg-[#FF6A1F] shadow-xs"
                              >
                                Start Baking
                              </button>
                            )}
                            {order.status === 'PROCESSING' && (
                              <>
                                <button
                                  onClick={() => handleTransitionStatus(order.id, 'READY_FOR_PICKUP')}
                                  className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 shadow-xs"
                                >
                                  Ready Pickup
                                </button>
                                <button
                                  onClick={() => handleTransitionStatus(order.id, 'OUT_FOR_DELIVERY')}
                                  className="px-2.5 py-1 rounded-full bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700 shadow-xs"
                                >
                                  Dispatch
                                </button>
                              </>
                            )}
                            {(order.status === 'READY_FOR_PICKUP' || order.status === 'OUT_FOR_DELIVERY') && (
                              <button
                                onClick={() => handleTransitionStatus(order.id, 'DELIVERED')}
                                className="px-2.5 py-1 rounded-full bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 shadow-xs"
                              >
                                Delivered ✓
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREPARATION & DISPATCH LIST */}
      {activeTab === 'prep' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Baking Preparation Aggregates */}
          <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#342421]/15">
              <ChefHat className="w-5 h-5 text-[#FF7836]" />
              <h2 className="font-display uppercase text-xl font-bold text-[#342421]">
                Today&apos;s Baking Quota
              </h2>
            </div>
            <p className="text-xs text-[#342421]/70 font-semibold">
              Aggregated units to bake across all confirmed & processing batches right now:
            </p>
            <div className="divide-y divide-[#342421]/10">
              {prepList.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#342421]/60 font-semibold">
                  No pending preparation items. All batches fulfilled!
                </div>
              ) : (
                prepList.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <span className="font-bold text-sm text-[#342421]">{item.name}</span>
                    <span className="px-3 py-1 rounded-full bg-[#342421] text-white font-mono font-bold text-xs">
                      {item.quantity} Units
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dispatch List */}
          <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b-2 border-[#342421]/15">
              <Truck className="w-5 h-5 text-emerald-700" />
              <h2 className="font-display uppercase text-xl font-bold text-[#342421]">
                Delivery & Dispatch Run
              </h2>
            </div>
            <p className="text-xs text-[#342421]/70 font-semibold">
              Orders flagged for doorstep delivery across Pune:
            </p>
            <div className="space-y-3">
              {orders
                .filter((o) => o.deliveryType === 'DELIVERY' && o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
                .map((order) => (
                  <div key={order.id} className="p-4 rounded-2xl bg-white border-2 border-[#342421] text-xs space-y-1.5 shadow-[2px_2px_0px_#342421]">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[#342421]">{order.orderNumber}</span>
                      <span className="text-[#FF7836] uppercase">{order.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-[#342421]/80 font-medium">
                      Recipient: <strong>{order.customerName}</strong>
                    </div>
                    <div className="text-[#342421]/70">
                      Total: {formatCurrency(order.totalAmount)} • ({order.paymentStatus})
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY MANAGEMENT & STOCK AUDIT */}
      {activeTab === 'inventory' && (
        <div className="space-y-8">
          {/* Modal / Dialog for Adjusting Stock */}
          {adjustingProduct && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 max-w-md w-full shadow-[6px_6px_0px_#342421] space-y-4">
                <div className="flex justify-between items-center pb-2 border-b-2 border-[#342421]/15">
                  <h3 className="font-display uppercase text-lg font-bold text-[#342421]">
                    Adjust Stock: {adjustingProduct.name}
                  </h3>
                  <button
                    onClick={() => setAdjustingProduct(null)}
                    className="text-xs font-bold text-[#342421]/60 hover:text-black"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleStockAdjustment} className="space-y-4 text-xs font-bold text-[#342421]">
                  <div>
                    <label className="block mb-1">Current Stock: {adjustingProduct.stockQuantity} {adjustingProduct.unitOfMeasure}</label>
                    <label className="block mb-1">New Absolute Stock Quantity</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newStockQty}
                      onChange={(e) => setNewStockQty(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-xl border-2 border-[#342421] bg-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block mb-1">Audit Reason Code</label>
                    <select
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      className="w-full px-4 py-2 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold"
                    >
                      <option value="RESTOCK_BATCH">RESTOCK_BATCH (Fresh Oven Batch Baked)</option>
                      <option value="OVEN_SPOILAGE">OVEN_SPOILAGE (Burnt or Spoiled Batch)</option>
                      <option value="INVENTORY_COUNT">INVENTORY_COUNT (End-of-Day Physical Count)</option>
                      <option value="DAMAGED">DAMAGED (Crushed or Broken Packaging)</option>
                      <option value="SAMPLE_TASTING">SAMPLE_TASTING (Store Counter Tasting)</option>
                      <option value="RETURN">RETURN (Retailer Quality Return)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1">Operational Notes</label>
                    <textarea
                      rows={2}
                      value={adjustmentNotes}
                      onChange={(e) => setAdjustmentNotes(e.target.value)}
                      placeholder="e.g. Batch #4 oven timer issue or morning restock"
                      className="w-full px-4 py-2 rounded-xl border-2 border-[#342421] bg-white text-xs"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAdjustingProduct(null)}
                      className="flex-1 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] text-xs font-bold shadow-[2px_2px_0px_#342421]"
                    >
                      Commit Stock Audit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Product Stock Table */}
          <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] shadow-[5px_5px_0px_#342421] overflow-hidden">
            <div className="p-4 bg-white border-b-2 border-[#342421]/15 flex items-center justify-between">
              <span className="font-display uppercase text-lg font-bold text-[#342421]">
                Catalog Stock & Minimum Order Quantities
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#342421] text-white uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Retail Price</th>
                    <th className="py-3 px-4">Wholesale Price</th>
                    <th className="py-3 px-4">MOQ</th>
                    <th className="py-3 px-4">Current Stock</th>
                    <th className="py-3 px-4 text-right">Stock Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-[#342421]/10 font-semibold">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-white/60">
                      <td className="py-3.5 px-4 font-bold text-[#342421]">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#342421]/70">{p.categoryName || 'Bakery'}</td>
                      <td className="py-3.5 px-4">{formatCurrency(p.retailPrice)}</td>
                      <td className="py-3.5 px-4 text-emerald-800 font-bold">{formatCurrency(p.wholesalePrice)}</td>
                      <td className="py-3.5 px-4 font-mono">{p.moq} {p.unitOfMeasure}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                            p.stockQuantity < 25
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setNewStockQty(p.stockQuantity);
                          }}
                          className="px-3 py-1 rounded-full bg-white border-2 border-[#342421] text-xs font-bold shadow-[2px_2px_0px_#342421] hover:bg-[#FF7836] hover:text-white transition-all"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-4">
            <h3 className="font-display uppercase text-lg font-bold text-[#342421] pb-2 border-b-2 border-[#342421]/15">
              Recent Inventory Stock Audits (Reason-Coded Audit Trail)
            </h3>
            <div className="divide-y divide-[#342421]/10 text-xs">
              {auditLogs.slice(0, 15).map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#342421]">{log.productName}</span>
                    <span className="text-[#342421]/60 text-[11px] ml-2">
                      by {log.adjustedByName} ({log.reasonCode})
                    </span>
                    {log.notes && (
                      <p className="text-[11px] text-[#342421]/70 italic mt-0.5">&ldquo;{log.notes}&rdquo;</p>
                    )}
                  </div>
                  <div className="font-mono font-bold">
                    <span>{log.previousQuantity}</span> → <span className="text-[#FF7836]">{log.newQuantity}</span> ({log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFLINE PAYMENT RECORDING */}
      {activeTab === 'payments' && (
        <div className="max-w-xl mx-auto bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-8 shadow-[5px_5px_0px_#342421] space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-[#342421]/15">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            <h2 className="font-display uppercase text-xl font-bold text-[#342421]">
              Record Counter or Driver Offline Payment
            </h2>
          </div>
          <p className="text-xs text-[#342421]/70 font-semibold">
            Record cash, UPI scanner, or cheque collected against an order or B2B invoice.
          </p>

          {payFeedback && (
            <div className="p-3.5 rounded-2xl bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421]">
              {payFeedback}
            </div>
          )}

          <form onSubmit={handleRecordOfflinePayment} className="space-y-4 text-xs font-bold text-[#342421]">
            <div>
              <label className="block mb-1">Select Order</label>
              <select
                value={payOrderId}
                onChange={(e) => {
                  setPayOrderId(e.target.value);
                  const found = orders.find((o) => o.id === e.target.value);
                  if (found) setPayAmount(found.totalAmount.toString());
                }}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold"
              >
                <option value="">-- Choose Order --</option>
                {orders
                  .filter((o) => o.paymentStatus !== 'PAID')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} • {o.customerName} • {formatCurrency(o.totalAmount)}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Amount Collected (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="block mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold"
              >
                <option value="CASH">Cash at Bakery Counter</option>
                <option value="UPI">Bakery QR / UPI Transaction</option>
                <option value="CHEQUE">Bank Cheque</option>
                <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">Reference / UTR / Cheque Number</label>
              <input
                type="text"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="e.g. UPI-984210 or CHQ-0045"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-bold"
              />
            </div>

            <div>
              <label className="block mb-1">Receipt Notes</label>
              <textarea
                rows={2}
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Collected by counter shift or driver"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-[#FF7836] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] hover:bg-[#FF6A1F] transition-all"
            >
              Confirm & Mark Order Paid
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: CUSTOMER ISSUE TICKETS */}
      {activeTab === 'issues' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Issue Tickets List (5 cols) */}
          <div className="lg:col-span-5 bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-4">
            <h2 className="font-display uppercase text-lg font-bold text-[#342421] pb-2 border-b-2 border-[#342421]/15">
              Support Issues & Disputes ({issues.length})
            </h2>
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#342421]/60 font-semibold">
                  No open customer issues!
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue)}
                    className={`p-4 rounded-2xl border-2 border-[#342421] text-xs cursor-pointer transition-all ${
                      selectedIssue?.id === issue.id
                        ? 'bg-[#FF7836] text-white shadow-[2px_2px_0px_#342421]'
                        : 'bg-white text-[#342421] hover:bg-[#FDF4E3]'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold mb-1">
                      <span>{issue.category}</span>
                      <span className="uppercase text-[10px]">{issue.status}</span>
                    </div>
                    <h4 className="font-bold text-sm leading-snug">{issue.shortDescription}</h4>
                    <span className="text-[10px] opacity-75 mt-1 block">
                      From: {issue.userName} ({issue.userEmail})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Issue Thread & Resolution (7 cols) */}
          <div className="lg:col-span-7 bg-[#FFF7EB] rounded-3xl border-2 border-[#342421] p-6 shadow-[5px_5px_0px_#342421] space-y-4">
            {selectedIssue ? (
              <div className="space-y-6">
                <div className="pb-3 border-b-2 border-[#342421]/15 flex items-center justify-between">
                  <div>
                    <h3 className="font-display uppercase text-lg font-bold text-[#342421]">
                      {selectedIssue.shortDescription}
                    </h3>
                    <span className="text-xs text-[#342421]/60">
                      From: {selectedIssue.userName} • Category: {selectedIssue.category}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#342421] text-white uppercase">
                    {selectedIssue.status}
                  </span>
                </div>

                {/* Messages Thread */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                  {selectedIssue.messages?.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                        msg.isInternalNote
                          ? 'bg-amber-100 border-2 border-amber-400 text-amber-950 ml-4'
                          : msg.senderRole.includes('ADMIN') || msg.senderRole.includes('MANAGER')
                          ? 'bg-[#342421] text-white ml-6'
                          : 'bg-white border-2 border-[#342421] text-[#342421] mr-6'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold text-[10px] opacity-75">
                        <span>
                          {msg.isInternalNote ? '🔒 INTERNAL STAFF NOTE by ' : ''}
                          {msg.senderName} ({msg.senderRole})
                        </span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed font-medium">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendIssueReply} className="space-y-3 pt-2 border-t-2 border-[#342421]/15">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="internal-note"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-[#342421] text-[#FF7836]"
                    />
                    <label htmlFor="internal-note" className="text-xs font-bold text-[#342421]">
                      Post as Internal Staff Note (hidden from customer)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder={isInternalNote ? 'Write internal note for staff...' : 'Reply to customer...'}
                      className="flex-1 px-4 py-2.5 rounded-full border-2 border-[#342421] bg-white text-xs font-bold"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-full bg-[#FF7836] text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421]"
                    >
                      Send
                    </button>
                  </div>
                </form>

                {/* Resolve Action */}
                {selectedIssue.status !== 'RESOLVED' && (
                  <div className="pt-3 border-t border-[#342421]/15 flex gap-2">
                    <input
                      type="text"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Resolution notes (e.g. refund issued / item replaced)"
                      className="flex-1 px-4 py-2 rounded-full border-2 border-[#342421] bg-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleResolveIssue}
                      className="px-4 py-2 rounded-full bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421]"
                    >
                      Resolve Issue ✓
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#342421]/60 font-semibold">
                Select a support issue from the left to view messages and respond.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
