'use client';

import React, { useState, useEffect } from 'react';
import { backendClient } from '../../../lib/api/backend-client';
import { RetailerProfile, PaymentTerms } from '../../../lib/api/types-v2';
import {
  Users,
  Building,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Shield,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';

export default function AdminRetailersPage() {
  const [retailers, setRetailers] = useState<RetailerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approvalForms, setApprovalForms] = useState<
    Record<string, { terms: PaymentTerms; limit: number; notes: string }>
  >({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadRetailers = async () => {
    setIsLoading(true);
    try {
      const page = await backendClient.getPendingRetailers();
      setRetailers(page.content || []);
      // Initialize form defaults for each retailer
      const forms: Record<string, { terms: PaymentTerms; limit: number; notes: string }> = {};
      (page.content || []).forEach((r) => {
        forms[r.id] = {
          terms: r.paymentTerms || 'NET_3',
          limit: r.creditLimit || 25000,
          notes: '',
        };
      });
      setApprovalForms(forms);
    } catch (err: any) {
      console.warn('Could not fetch pending retailers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRetailers();
  }, []);

  const handleDecision = async (
    profileId: string,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    setProcessingId(profileId);
    setFeedback(null);
    const form = approvalForms[profileId] || {
      terms: 'NET_3' as PaymentTerms,
      limit: 25000,
      notes: '',
    };

    try {
      await backendClient.approveRetailer(profileId, {
        status: decision,
        paymentTerms: form.terms,
        creditLimit: form.limit,
        reviewNotes: form.notes || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Retailer profile successfully ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`,
      });
      await loadRetailers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update retailer profile decision.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6DAC8]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#9C3D2B] uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            Wholesale Network Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-[#2D211B]">
            Retailer Applications & Credit Terms
          </h1>
          <p className="text-sm text-[#7A685D] mt-1">
            Review shopkeeper registrations, verify GSTIN compliance, and set revolving credit limits.
          </p>
        </div>

        <button
          onClick={loadRetailers}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-[#D5C7B4] hover:bg-[#FDFBF7] text-[#6A4B35] transition shadow-2xs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Retailers List */}
      {isLoading ? (
        <div className="py-16 text-center text-[#7A685D] bg-white rounded-2xl border border-[#E6DAC8]">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#9C3D2B] mb-3" />
          <p className="text-sm">Loading pending retailer applications...</p>
        </div>
      ) : retailers.length === 0 ? (
        <div className="py-16 text-center text-[#7A685D] bg-white rounded-2xl border border-[#E6DAC8]">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#2D211B]">No Pending Applications</h3>
          <p className="text-sm text-[#7A685D] mt-1">
            All registered bakery shopkeepers and cafe partners have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {retailers.map((retailer) => {
            const form = approvalForms[retailer.id] || {
              terms: 'NET_3' as PaymentTerms,
              limit: 25000,
              notes: '',
            };
            const isProcessing = processingId === retailer.id;

            return (
              <div
                key={retailer.id}
                className="bg-white rounded-2xl border border-[#E6DAC8] p-6 shadow-sm flex flex-col lg:flex-row gap-6 justify-between"
              >
                {/* Left: Shop info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-[#2D211B]">
                          {retailer.businessName}
                        </h2>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {retailer.approvalStatus}
                        </span>
                      </div>
                      <p className="text-xs text-[#7A685D] mt-0.5">
                        Profile ID: <span className="font-mono">{retailer.id.slice(0, 8)}...</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#FDFBF7] p-4 rounded-xl border border-[#F4E8D6]">
                    <div>
                      <span className="text-[#8C7A6B] block">Contact Person:</span>
                      <strong className="text-[#2D211B] text-sm">
                        {retailer.contactPersonName || 'Not specified'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Contact Phone:</span>
                      <strong className="text-[#2D211B] text-sm font-mono">
                        {retailer.contactPhone || 'Not provided'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">GSTIN Tax Registration:</span>
                      <strong className="text-[#2D211B] font-mono text-sm">
                        {retailer.gstNumber || 'Unregistered / Composition'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[#8C7A6B] block">Existing Credit Pool:</span>
                      <strong className="text-[#2D211B] text-sm">
                        {formatCurrency(retailer.creditLimit || 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right: Decision controls */}
                <div className="lg:w-80 bg-[#FAF5EE] p-5 rounded-xl border border-[#E6DAC8] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#6A4B35]">
                      Set Approval Terms
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#6A4B35] mb-1">
                        Settlement Cycle
                      </label>
                      <select
                        value={form.terms}
                        onChange={(e) =>
                          setApprovalForms((prev) => ({
                            ...prev,
                            [retailer.id]: {
                              ...prev[retailer.id],
                              terms: e.target.value as PaymentTerms,
                            },
                          }))
                        }
                        className="w-full text-xs px-3 py-2 bg-white border border-[#D5C7B4] rounded-lg focus:ring-2 focus:ring-[#9C3D2B]"
                      >
                        <option value="IMMEDIATE">IMMEDIATE (Pay on Dispatch)</option>
                        <option value="NET_3">NET_3 (Weekly 3-Day Cycle)</option>
                        <option value="NET_15">NET_15 (Bi-Weekly 15-Day Cycle)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#6A4B35] mb-1">
                        Approved Credit Limit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={form.limit}
                        onChange={(e) =>
                          setApprovalForms((prev) => ({
                            ...prev,
                            [retailer.id]: {
                              ...prev[retailer.id],
                              limit: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full text-xs px-3 py-2 bg-white border border-[#D5C7B4] rounded-lg font-mono focus:ring-2 focus:ring-[#9C3D2B]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleDecision(retailer.id, 'APPROVED')}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Saving...' : 'Approve Shop'}</span>
                    </button>
                    <button
                      onClick={() => handleDecision(retailer.id, 'REJECTED')}
                      disabled={isProcessing}
                      className="py-2.5 px-3 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 border border-red-200 transition disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
