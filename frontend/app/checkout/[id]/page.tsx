'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Store,
  ArrowRight,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { BakeryProcessingSuite } from '../../../components/checkout/bakery-processing-suite';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api/client';

interface CheckoutState {
  paymentId: string;
  orderId?: string;
  orderNumber?: string;
  amount: number;
  currency: string;
  status: string;
  payeeVpa: string;
  payeeName: string;
  upiUri: string;
}

const DEFAULT_VPA = '9699197282@ibl';
const DEFAULT_PAYEE = 'MRUNAL KAILASH JADHAV';

export default function CheckoutAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'upi' | 'amount' | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch initial payment session state
  useEffect(() => {
    if (!paymentId) return;

    let isMounted = true;

    async function loadPaymentState() {
      setIsLoading(true);
      setError(null);

      try {
        // Try fetching state from YouPi PG checkout state endpoint
        const res = await fetch(`/api/v1/checkout/${paymentId}/state`, {
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (!isMounted) return;

          const amountVal =
            typeof data.amount === 'number'
              ? data.amount
              : parseFloat(data.amount) || (data.amountPaise ? data.amountPaise / 100 : 1.51);

          const vpa = data.payeeVpa || data.vpa || DEFAULT_VPA;
          const payee = data.payeeName || data.merchantName || DEFAULT_PAYEE;
          const amtStr = amountVal.toFixed(2);
          const upiUri =
            data.upiUri ||
            `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
              payee
            )}&am=${amtStr}&cu=INR&tn=${encodeURIComponent(
              data.orderId ? `Order ${data.orderId}` : `Payment ${paymentId}`
            )}`;

          const parsedState: CheckoutState = {
            paymentId: data.paymentId || paymentId,
            orderId: data.orderId || data.metadata?.orderId,
            orderNumber: data.orderNumber || data.metadata?.orderNumber || data.orderId,
            amount: amountVal,
            currency: data.currency || 'INR',
            status: data.status || 'ACTIVE',
            payeeVpa: vpa,
            payeeName: payee,
            upiUri,
          };

          setCheckoutState(parsedState);

          if (parsedState.status === 'PAID' || parsedState.status === 'AUTHORIZED') {
            setIsPaid(true);
            const redirectTarget = parsedState.orderNumber || parsedState.orderId;
            if (redirectTarget) {
              setTimeout(() => {
                router.push(`/order/${redirectTarget}?success=true`);
              }, 1200);
            }
            return;
          }

          // Generate QR Code
          try {
            const qr = await QRCode.toDataURL(upiUri, {
              width: 280,
              margin: 1,
              color: {
                dark: '#342421',
                light: '#FFFFFF',
              },
            });
            if (isMounted) setQrDataUrl(qr);
          } catch (qrErr) {
            console.error('Failed to generate QR data URL:', qrErr);
          }

          setIsLoading(false);
          return;
        }

        // Fallback: Query backend payment attempt status
        const attempt = await apiClient.getPaymentStatus(paymentId).catch(() => null);
        if (attempt && isMounted) {
          const vpa = DEFAULT_VPA;
          const payee = DEFAULT_PAYEE;
          const amtStr = Number(attempt.amount).toFixed(2);
          const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
            payee
          )}&am=${amtStr}&cu=INR&tn=${encodeURIComponent(
            attempt.orderNumber ? `Order ${attempt.orderNumber}` : `Payment ${paymentId}`
          )}`;

          const parsedState: CheckoutState = {
            paymentId: attempt.id || paymentId,
            orderId: attempt.orderId,
            orderNumber: attempt.orderNumber,
            amount: attempt.amount,
            currency: attempt.currency || 'INR',
            status: attempt.status,
            payeeVpa: vpa,
            payeeName: payee,
            upiUri,
          };

          setCheckoutState(parsedState);

          if (parsedState.status === 'PAID' || parsedState.status === 'AUTHORIZED') {
            setIsPaid(true);
            const redirectTarget = parsedState.orderNumber || parsedState.orderId;
            if (redirectTarget) {
              setTimeout(() => {
                router.push(`/order/${redirectTarget}?success=true`);
              }, 1200);
            }
            return;
          }

          const qr = await QRCode.toDataURL(upiUri, {
            width: 280,
            margin: 1,
            color: { dark: '#342421', light: '#FFFFFF' },
          });
          if (isMounted) setQrDataUrl(qr);
          setIsLoading(false);
          return;
        }

        // If not found yet, wait and display the Bakery Processing Suite while connecting
        if (isMounted) {
          setError('Payment session is being prepared by the bakery dispatch gateway.');
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Connecting to payment gateway...');
          setIsLoading(false);
        }
      }
    }

    loadPaymentState();

    return () => {
      isMounted = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [paymentId, router]);

  // 2. Poll for payment confirmation via background observer
  useEffect(() => {
    if (!checkoutState || isPaid || checkoutState.status === 'PAID') return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/checkout/${paymentId}/state`, {
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (data.status === 'PAID' || data.status === 'AUTHORIZED') {
            setIsPaid(true);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            const target = data.orderNumber || data.orderId || checkoutState.orderNumber || checkoutState.orderId;
            if (target) {
              setTimeout(() => {
                router.push(`/order/${target}?success=true`);
              }, 1200);
            }
          }
        }
      } catch {
        // Continue polling silently
      }
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkoutState, isPaid, paymentId, router]);

  const copyToClipboard = async (text: string, field: 'upi' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleManualCheck = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/v1/checkout/${paymentId}/state`, {
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data.status === 'PAID' || data.status === 'AUTHORIZED') {
          setIsPaid(true);
          const target = data.orderNumber || data.orderId || checkoutState?.orderNumber || checkoutState?.orderId;
          if (target) {
            router.push(`/order/${target}?success=true`);
            return;
          }
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // 1. Loading state: Render the Bakery Processing Suite
  if (isLoading) {
    return (
      <StorefrontLayout>
        <BakeryProcessingSuite
          step={3}
          customMessage="Connecting to your live UPI payment counter and reserving your morning batch slot..."
        />
      </StorefrontLayout>
    );
  }

  // 2. Success state
  if (isPaid) {
    return (
      <StorefrontLayout>
        <div className="py-16 max-w-xl mx-auto px-4 text-center">
          <div className="bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl p-8 sm:p-10 shadow-[6px_6px_0px_#342421] space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border-2 border-[#342421] text-emerald-800 flex items-center justify-center mx-auto shadow-[3px_3px_0px_#342421] animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Payment Received & Reconciled
              </span>
              <h2 className="font-display uppercase text-3xl font-bold text-[#342421]">
                Bakes Scheduled for Dispatch!
              </h2>
            </div>
            <p className="text-sm text-[#342421]/80 max-w-sm mx-auto leading-relaxed">
              Your UPI payment has been verified by our automated banking observer. Redirecting to your confirmed order receipt...
            </p>
            <div className="pt-2">
              <Link
                href={
                  checkoutState?.orderNumber
                    ? `/order/${checkoutState.orderNumber}?success=true`
                    : '/account/orders'
                }
              >
                <button
                  type="button"
                  className="px-6 py-3 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  <span>Go to Order Receipt</span>
                  <ArrowRight className="w-4 h-4 text-[#342421]" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  // 3. Active Checkout State: Render Authentic BakeConnect UPI Payment Card
  if (checkoutState) {
    return (
      <StorefrontLayout>
        <div className="py-12 sm:py-16 max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl p-6 sm:p-10 shadow-[6px_6px_0px_#342421] space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-6 border-b-2 border-[#342421]/15">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider">
                <Store className="w-3.5 h-3.5 text-[#FF7836]" />
                <span>BakeConnect UPI Payment Counter</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#342421]/70">
                Session: {paymentId.slice(0, 8)}...
              </span>
            </div>

            {/* Total Amount Callout */}
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#342421]/70">
                Exact Authoritative Amount Payable
              </span>
              <div className="font-display text-4xl sm:text-5xl font-bold text-[#342421] tracking-tight">
                {formatCurrency(checkoutState.amount)}
              </div>
              <p className="text-xs text-[#342421]/75 max-w-md mx-auto">
                Includes unique verification paise for instant zero-UTR bank reconciliation. Pay the exact amount shown.
              </p>
            </div>

            {/* Dynamic QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="Scan UPI QR Code to Pay"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <span className="text-xs font-bold text-[#342421]/80 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7836]" />
                  Scan with PhonePe, GPay, Paytm or BHIM
                </span>
              </div>
            )}

            {/* VPA Copy Fields */}
            <div className="bg-white rounded-2xl border-2 border-[#342421] p-4 space-y-3 shadow-[2px_2px_0px_#342421]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#342421]/70 font-semibold">Payee Name:</span>
                <span className="font-bold text-[#342421] font-mono">{checkoutState.payeeName}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#342421]/10">
                <span className="text-[#342421]/70 font-semibold">UPI VPA:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#342421]">{checkoutState.payeeVpa}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(checkoutState.payeeVpa, 'upi')}
                    className="p-1 hover:bg-[#FFF7EB] rounded border border-[#342421]/30 text-[#342421]"
                    title="Copy UPI ID"
                  >
                    {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile 1-Tap App Deep Links */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#342421]/60 block text-center">
                Or Tap to Pay via UPI App
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href={`phonepe://pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#5f259f]" />
                  <span>PhonePe</span>
                </a>
                <a
                  href={`gpay://upi/pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#4285F4]" />
                  <span>GPay</span>
                </a>
                <a
                  href={`paytmmp://pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#00baf2]" />
                  <span>Paytm</span>
                </a>
                <a
                  href={checkoutState.upiUri}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#FF7836]" />
                  <span>Other UPI</span>
                </a>
              </div>
            </div>

            {/* Live Banking SMS Observer Status */}
            <div className="p-3.5 bg-emerald-50 border-2 border-emerald-700/40 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-semibold">
                  Listening for HDFC bank SMS confirmation on {checkoutState.payeeVpa}...
                </span>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isVerifying}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold text-[#342421] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Checking Bank Ledger...' : 'Refresh Status'}</span>
              </button>

              {checkoutState.orderNumber && (
                <Link
                  href={`/order/${checkoutState.orderNumber}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#342421] hover:text-[#FF7836] underline underline-offset-4 py-2"
                >
                  <span>View Order Details (#{checkoutState.orderNumber})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  // 4. Fallback / Expired State: Reassuring Bakery Guidance
  return (
    <StorefrontLayout>
      <div className="py-16 max-w-xl mx-auto px-4 text-center">
        <div className="bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl p-8 sm:p-10 shadow-[6px_6px_0px_#342421] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D9EAF3] border-2 border-[#342421] text-[#342421] flex items-center justify-center mx-auto shadow-[2px_2px_0px_#342421]">
            <Store className="w-7 h-7 text-[#FF7836]" />
          </div>
          <h2 className="font-display uppercase text-2xl font-bold text-[#342421]">
            Checkout Session Completed or Moved
          </h2>
          <p className="text-sm text-[#342421]/75 max-w-md mx-auto leading-relaxed">
            {error ||
              'This checkout session has already transitioned to fulfillment or was cleared. You can track your confirmed bakes in My Orders.'}
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/account/orders">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] transition-all"
              >
                View My Orders
              </button>
            </Link>
            <Link href="/shop">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white hover:bg-[#FFF7EB] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] transition-all"
              >
                Return to Catalog
              </button>
            </Link>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
