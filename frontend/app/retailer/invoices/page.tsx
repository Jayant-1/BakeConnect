'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api/client';
import { Invoice, RetailerProfile } from '../../../lib/api/types';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  FileText,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Download,
  AlertCircle,
  Building,
} from 'lucide-react';

export default function RetailerInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<RetailerProfile | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [invs, userProfile] = await Promise.all([
          apiClient.getRetailerInvoices(),
          apiClient.getCurrentUser('RETAILER'),
        ]);
        setInvoices(invs);
        if (userProfile.retailerProfile) setProfile(userProfile.retailerProfile);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      }
    }
    loadData();
  }, []);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0);

  const handlePayInvoice = async (invoiceId: string) => {
    setIsProcessingId(invoiceId);
    setSuccessMessage(null);
    try {
      const updated = await apiClient.payInvoice(invoiceId);
      setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updated : i)));
      setSuccessMessage(`Invoice ${updated.invoiceNumber} successfully settled via YouPI-PG.`);
    } catch (err) {
      console.error('Invoice payment failed:', err);
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="py-8 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/retailer"
            className="inline-flex items-center gap-1.5 text-xs text-crust-muted hover:text-berry-jam mb-2 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Digital Order Guide</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-crust-dark">
            Wholesale Commercial Invoices & Ledger
          </h1>
          <p className="text-xs text-crust-muted mt-1">
            Authoritative statement of accounts under Net-15 credit settlement terms.
          </p>
        </div>

        <Badge variant="sea" className="px-4 py-1.5 text-xs font-bold">
          Account Terms: Net-15 Credit
        </Badge>
      </div>

      {/* Credit & Balance KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="text-[11px] uppercase font-bold text-crust-muted">Total Outstanding Due</div>
          <div className="text-2xl font-bold text-berry-jam font-mono mt-1">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-xs text-crust-muted mt-2">
            Consolidated dues under active billing cycle.
          </div>
        </div>

        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="text-[11px] uppercase font-bold text-crust-muted">Available Credit Facility</div>
          <div className="text-2xl font-bold text-status-success font-mono mt-1">
            {formatCurrency(profile?.availableCredit || 94250)}
          </div>
          <div className="text-xs text-crust-muted mt-2">
            Credit Limit: {formatCurrency(profile?.creditLimit || 150000)}
          </div>
        </div>

        <div className="bg-cream-surface rounded-2xl p-6 border border-cream-border shadow-xs">
          <div className="text-[11px] uppercase font-bold text-crust-muted">Next Cycle Due Date</div>
          <div className="text-2xl font-bold text-crust-dark font-mono mt-1">
            Nov 12, 2026
          </div>
          <div className="text-xs text-crust-muted mt-2">
            Automated tax invoice delivered to accounting.
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-status-success-bg border border-status-success/30 text-xs text-status-success font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Invoices Table */}
      <div className="bg-cream-surface rounded-3xl border border-cream-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-cream-border">
          <h2 className="font-display text-xl font-semibold text-crust-dark">
            Commercial Invoices
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream-base/80 border-b border-cream-border text-crust-muted uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-6">Invoice #</th>
                <th className="py-3.5 px-4">Order Ref</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Invoice Amount</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-border/60 text-crust-dark">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-cream-subtle/30 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-crust-dark">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-4 px-4 font-mono text-crust-muted">
                    {inv.orderNumber}
                  </td>
                  <td className="py-4 px-4 text-crust-muted">
                    {formatDate(inv.issuedAt)}
                  </td>
                  <td className="py-4 px-4 text-crust-muted font-medium">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold">
                    {formatCurrency(inv.amount)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono font-bold text-berry-jam">
                    {formatCurrency(inv.outstandingBalance)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <Badge variant={inv.status === 'PAID' ? 'success' : 'warning'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {inv.status === 'PENDING' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handlePayInvoice(inv.id)}
                        isLoading={isProcessingId === inv.id}
                        className="rounded-full px-3 text-xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1" />
                        <span>Settle via YouPI-PG</span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.print()}
                        className="rounded-full px-3 text-xs"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        <span>Receipt</span>
                      </Button>
                    )}
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
