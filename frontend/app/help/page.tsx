'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StorefrontLayout } from '../../components/layout/storefront-layout';
import { useAuth } from '../../lib/store/auth-context';
import { backendClient } from '../../lib/api/backend-client';
import { CustomerIssue, Order } from '../../lib/api/types-v2';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  HelpCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  MapPin,
  Send,
  Plus,
  ShoppingBag,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'DAMAGED_ITEM', label: 'Damaged or crushed baked item' },
  { value: 'DELAYED_DELIVERY', label: 'Delayed delivery past fresh window' },
  { value: 'WRONG_ITEM', label: 'Wrong or missing item in basket' },
  { value: 'QUALITY_ISSUE', label: 'Taste, freshness or texture issue' },
  { value: 'BILLING_QUERY', label: 'Billing, invoice or payment query' },
  { value: 'OTHER', label: 'Other enquiry or feedback' },
];

export default function CustomerHelpPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // State
  const [issues, setIssues] = useState<CustomerIssue[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<CustomerIssue | null>(null);

  // New Ticket Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('DAMAGED_ITEM');
  const [shortDescription, setShortDescription] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Reply State
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  // Fetch customer's orders and tickets
  const loadData = async () => {
    if (!isAuthenticated) return;
    setLoadingIssues(true);
    try {
      const [issuesPage, ordersPage] = await Promise.all([
        backendClient.getMyCustomerIssues(0, 50),
        backendClient.getMyOrders(0, 30),
      ]);
      setIssues(issuesPage.content || []);
      setOrders(ordersPage.content || []);

      // If an issue was selected, refresh its details
      if (selectedIssue) {
        const updated = await backendClient.getCustomerIssueDetails(selectedIssue.id);
        setSelectedIssue(updated);
      }
    } catch (err: any) {
      console.warn('Could not load customer support data:', err);
    } finally {
      setLoadingIssues(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortDescription.trim() || !message.trim()) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const newIssue = await backendClient.createCustomerIssue({
        orderId: selectedOrderId ? selectedOrderId : undefined,
        category: selectedCategory,
        shortDescription: shortDescription.trim(),
        message: message.trim(),
      });

      setFeedback({
        type: 'success',
        message: 'Your support ticket has been received by our Pune bakery team. We will review and reply promptly.',
      });
      setShowCreateModal(false);
      setShortDescription('');
      setMessage('');
      setSelectedOrderId('');
      await loadData();
      setSelectedIssue(newIssue);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit support ticket. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !replyText.trim()) return;

    setReplying(true);
    try {
      const updated = await backendClient.replyToCustomerIssue(selectedIssue.id, replyText.trim());
      setSelectedIssue(updated);
      setReplyText('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  return (
    <StorefrontLayout>
      <div className="bg-[#FFF7EB] min-h-[75vh] py-10 sm:py-14 text-[#342421]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b-2 border-[#342421]/15">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#342421] text-[#FFF7EB]">
                <HelpCircle className="w-3.5 h-3.5 text-[#FF7836]" />
                Customer & Retailer Care
              </span>
              <span className="text-xs text-[#342421]/60 font-medium">
                BakeConnect Pune • Fast Turnaround Support
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display uppercase tracking-tight text-[#342421]">
              Help, Resolution & Order Support
            </h1>
            <p className="text-sm text-[#342421]/75 mt-1 font-medium">
              We stand behind every fresh loaf, bun, and batch baked in our Koregaon Park ovens.
            </p>
          </div>

          {isAuthenticated ? (
            <button
              onClick={() => {
                setFeedback(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#342421] text-[#FFF7EB] text-xs font-bold uppercase tracking-wider hover:bg-[#1E1412] transition-all shadow-[3px_3px_0px_#FF7836]"
            >
              <Plus className="w-4 h-4 text-[#FF7836]" />
              File an Issue or Problem
            </button>
          ) : (
            <Link
              href="/login?redirect=/help"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF7836] text-[#342421] text-xs font-bold uppercase tracking-wider hover:bg-[#e06527] transition-all shadow-[3px_3px_0px_#342421]"
            >
              Log In to Track Tickets
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
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
                <AlertCircle className="w-5 h-5 shrink-0" />
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

        {/* Contact Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex items-start gap-3.5">
            <span className="p-2.5 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#FF7836] shrink-0">
              <Phone className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-0.5">
                Bakery Direct Line
              </span>
              <p className="font-bold text-sm text-[#342421]">+91 20 2615 8890</p>
              <p className="text-[11px] text-[#342421]/70 mt-1">
                Mon - Sun: 6:00 AM – 10:00 PM IST
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex items-start gap-3.5">
            <span className="p-2.5 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#FF7836] shrink-0">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-0.5">
                Support & Billing Desk
              </span>
              <p className="font-bold text-sm text-[#342421]">care@bakeconnect.com</p>
              <p className="text-[11px] text-[#342421]/70 mt-1">
                Wholesale invoices & customer queries
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] flex items-start gap-3.5">
            <span className="p-2.5 rounded-xl bg-[#FFF7EB] border border-[#342421] text-[#FF7836] shrink-0">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#342421]/60 block mb-0.5">
                Bakery Bakehouse
              </span>
              <p className="font-bold text-sm text-[#342421]">Lane 7, Koregaon Park</p>
              <p className="text-[11px] text-[#342421]/70 mt-1">
                Pune, Maharashtra 411001
              </p>
            </div>
          </div>
        </div>

        {/* Support Tickets Section */}
        {isAuthenticated ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Tickets List */}
            <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] overflow-hidden">
              <div className="p-4 bg-[#FFF7EB] border-b-2 border-[#342421] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#FF7836]" />
                  <h3 className="font-display uppercase text-sm tracking-wider text-[#342421]">
                    My Support Requests ({issues.length})
                  </h3>
                </div>
                <button
                  onClick={loadData}
                  className="p-1 hover:bg-[#F2E5D0] rounded-md transition-colors"
                  title="Refresh Tickets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingIssues ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingIssues && issues.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#342421]/60 font-semibold">
                  Checking for support tickets...
                </div>
              ) : issues.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-[#2D7A4D] mx-auto" />
                  <p className="font-display uppercase text-sm text-[#342421]">
                    No Active Issues Reported
                  </p>
                  <p className="text-xs text-[#342421]/70 max-w-xs mx-auto">
                    If an item arrives damaged or late, you can report it anytime using the button above.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#342421]/10 max-h-[500px] overflow-y-auto">
                  {issues.map((iss) => (
                    <button
                      key={iss.id}
                      onClick={() => setSelectedIssue(iss)}
                      className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                        selectedIssue?.id === iss.id
                          ? 'bg-[#FFF7EB] border-l-4 border-l-[#FF7836]'
                          : 'hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              iss.status === 'RESOLVED' || iss.status === 'CLOSED'
                                ? 'bg-[#EBF7EE] text-[#1E5234]'
                                : iss.status === 'IN_PROGRESS'
                                ? 'bg-[#D9EAF3] text-[#1E3A8A]'
                                : 'bg-[#FFF7EB] text-[#FF7836] border border-[#FF7836]'
                            }`}
                          >
                            {iss.status.replace('_', ' ')}
                          </span>
                          {iss.orderNumber && (
                            <span className="text-[10px] font-mono text-[#342421]/60">
                              {iss.orderNumber}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-[#342421] truncate">
                          {iss.shortDescription}
                        </h4>
                        <span className="text-[10px] text-[#342421]/50 block">
                          Filed {new Date(iss.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#342421]/40 shrink-0 mt-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Selected Ticket Detail & Messages */}
            <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] p-6 space-y-5">
              {selectedIssue ? (
                <>
                  {/* Issue Header */}
                  <div className="pb-4 border-b-2 border-[#342421]/10 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7836]">
                          {selectedIssue.category.replace('_', ' ')}
                        </span>
                        <h3 className="font-display uppercase text-xl text-[#342421]">
                          {selectedIssue.shortDescription}
                        </h3>
                        {selectedIssue.orderNumber && (
                          <span className="text-xs text-[#342421]/70 font-semibold">
                            Tied to Order: <span className="font-mono text-[#FF7836]">{selectedIssue.orderNumber}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          selectedIssue.status === 'RESOLVED' || selectedIssue.status === 'CLOSED'
                            ? 'bg-[#EBF7EE] text-[#1E5234] border border-[#2D7A4D]'
                            : selectedIssue.status === 'IN_PROGRESS'
                            ? 'bg-[#D9EAF3] text-[#1E3A8A] border border-[#3B82F6]'
                            : 'bg-[#FFF7EB] text-[#FF7836] border border-[#FF7836]'
                        }`}
                      >
                        {selectedIssue.status.replace('_', ' ')}
                      </span>
                    </div>

                    {selectedIssue.resolutionNotes && (
                      <div className="p-3 bg-[#EBF7EE] rounded-xl border border-[#2D7A4D] text-xs text-[#1E5234]">
                        <span className="font-bold block mb-0.5">Bakery Resolution Note:</span>
                        {selectedIssue.resolutionNotes}
                      </div>
                    )}
                  </div>

                  {/* Conversation Messages Thread */}
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {selectedIssue.messages.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#342421]/50">
                        No messages recorded yet.
                      </div>
                    ) : (
                      selectedIssue.messages.map((m) => {
                        const isStaff = m.senderRole === 'BAKERY_ADMIN' || m.senderRole === 'BAKERY_MANAGER';
                        return (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-2xl text-xs max-w-[85%] space-y-1 ${
                              isStaff
                                ? 'bg-[#D9EAF3] border-2 border-[#342421] mr-auto'
                                : 'bg-[#FFF7EB] border-2 border-[#342421] ml-auto'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="font-bold text-[#342421]">
                                {isStaff ? '🧑‍🍳 BakeConnect Team' : '👤 You'}
                              </span>
                              <span className="text-[#342421]/50 font-normal">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <p className="text-[#342421] leading-relaxed font-medium">
                              {m.message}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Input Box */}
                  {selectedIssue.status !== 'CLOSED' ? (
                    <form onSubmit={handleSendReply} className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply to the bakery team..."
                        className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#342421] text-xs font-medium focus:ring-2 focus:ring-[#FF7836] bg-[#FAF7F2]"
                      />
                      <button
                        type="submit"
                        disabled={replying || !replyText.trim()}
                        className="p-2.5 rounded-xl bg-[#342421] text-[#FFF7EB] hover:bg-[#1E1412] disabled:opacity-50 transition-colors shadow-[2px_2px_0px_#FF7836]"
                        title="Send Reply"
                      >
                        <Send className="w-4 h-4 text-[#FF7836]" />
                      </button>
                    </form>
                  ) : (
                    <div className="p-3 bg-[#FAF7F2] rounded-xl text-center text-xs text-[#342421]/60 font-semibold border border-[#342421]/15">
                      This ticket has been marked as closed.
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-[#342421]/30 mx-auto" />
                  <p className="font-display uppercase text-sm text-[#342421]/70">
                    Select a support ticket
                  </p>
                  <p className="text-xs text-[#342421]/50">
                    View conversation history and reply to the bakery fulfillment team.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] text-center space-y-4 max-w-lg mx-auto">
            <ShieldAlert className="w-10 h-10 text-[#FF7836] mx-auto" />
            <h3 className="font-display uppercase text-xl text-[#342421]">
              Sign In to File & Track Support Tickets
            </h3>
            <p className="text-xs text-[#342421]/75 leading-relaxed">
              Logging into your account allows you to select specific bakery orders, check dispatch and transit status, and receive real-time updates directly from our bakery manager.
            </p>
            <div className="pt-2">
              <Link
                href="/login?redirect=/help"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#342421] text-[#FFF7EB] text-xs font-bold uppercase tracking-wider hover:bg-[#1E1412] transition-all shadow-[3px_3px_0px_#FF7836]"
              >
                Sign In to Your Account
                <ArrowRight className="w-4 h-4 text-[#FF7836]" />
              </Link>
            </div>
          </div>
        )}

        {/* Modal: Create New Support Ticket */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] bg-[#342421]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFF7EB] rounded-2xl border-2 border-[#342421] shadow-[6px_6px_0px_#342421] max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF7836]">
                    Direct Support Request
                  </span>
                  <h3 className="font-display uppercase text-xl text-[#342421]">
                    Report an Order Problem
                  </h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-[#342421]/60 hover:text-[#342421] text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                {/* Order Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                    Associated Order (Optional)
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-semibold text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                  >
                    <option value="">General Enquiry (No specific order)</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber} — {formatCurrency(o.totalAmount)} ({o.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                    Issue Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-semibold text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Short Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                    Summary / Short Headline
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="e.g. Broken loaf in delivery package..."
                    required
                    maxLength={255}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#342421] bg-white text-xs font-semibold text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                {/* Detailed Message */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#342421] mb-1.5">
                    What Happened? (Details)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please explain the issue so our Koregaon Park team can resolve it or issue a replacement/refund..."
                    rows={4}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-[#342421] bg-white text-xs font-medium text-[#342421] focus:ring-2 focus:ring-[#FF7836]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-[#342421]/15">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-[#342421] hover:bg-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !shortDescription.trim() || !message.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#342421] text-[#FFF7EB] text-xs font-bold uppercase tracking-wider hover:bg-[#1E1412] disabled:opacity-50 transition-all shadow-[3px_3px_0px_#FF7836]"
                  >
                    {submitting ? 'Submitting...' : 'Submit Support Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  </StorefrontLayout>
  );
}
