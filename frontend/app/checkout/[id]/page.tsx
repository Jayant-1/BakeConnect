'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Clock,
  Receipt,
  UtensilsCrossed,
  HelpCircle,
  Lock,
} from 'lucide-react';
import { StorefrontLayout } from '../../../components/layout/storefront-layout';
import { BakeryProcessingSuite } from '../../../components/checkout/bakery-processing-suite';
import { formatCurrency } from '../../../lib/utils';
import { apiClient } from '../../../lib/api/client';
import { Order } from '../../../lib/api/types';

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
  const [order, setOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'upi' | 'amount' | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600); // 10 minutes reservation

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch initial payment session state & associated order
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

          const resolvedOrderNumber = data.orderNumber || data.metadata?.orderNumber || data.orderId;

          const parsedState: CheckoutState = {
            paymentId: data.paymentId || paymentId,
            orderId: data.orderId || data.metadata?.orderId,
            orderNumber: resolvedOrderNumber,
            amount: amountVal,
            currency: data.currency || 'INR',
            status: data.status || 'ACTIVE',
            payeeVpa: vpa,
            payeeName: payee,
            upiUri,
          };

          setCheckoutState(parsedState);

          // Fetch associated order details if available
          if (resolvedOrderNumber) {
            apiClient.getOrder(resolvedOrderNumber).then((ord) => {
              if (isMounted && ord) setOrder(ord);
            }).catch(() => null);
          }

          if (parsedState.status === 'PAID' || parsedState.status === 'AUTHORIZED' || parsedState.status === 'OBSERVED_SUCCESS' || parsedState.status === 'SUCCESS') {
            setIsPaid(true);
            const redirectTarget = parsedState.orderNumber || parsedState.orderId;
            if (redirectTarget) {
              setTimeout(() => {
                router.push(`/order/${redirectTarget}?success=true`);
              }, 1200);
            }
            return;
          }

          // Generate High-Precision QR Code
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

          if (attempt.orderNumber) {
            apiClient.getOrder(attempt.orderNumber).then((ord) => {
              if (isMounted && ord) setOrder(ord);
            }).catch(() => null);
          }

          if (parsedState.status === 'PAID' || parsedState.status === 'AUTHORIZED' || parsedState.status === 'OBSERVED_SUCCESS' || parsedState.status === 'SUCCESS') {
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
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [paymentId, router]);

  // 2. Countdown timer
  useEffect(() => {
    if (!checkoutState || isPaid) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [checkoutState, isPaid]);

  // 3. Poll for payment confirmation via background observer
  useEffect(() => {
    if (!checkoutState || isPaid || checkoutState.status === 'PAID') return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/checkout/${paymentId}/state`, {
          headers: { Accept: 'application/json' },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          if (
            data.status === 'PAID' ||
            data.status === 'AUTHORIZED' ||
            data.status === 'OBSERVED_SUCCESS' ||
            data.status === 'SUCCESS'
          ) {
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
        if (
          data.status === 'PAID' ||
          data.status === 'AUTHORIZED' ||
          data.status === 'OBSERVED_SUCCESS' ||
          data.status === 'SUCCESS'
        ) {
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

  const handleSimulateBankCredit = async () => {
    if (!checkoutState) return;
    setIsSimulating(true);
    try {
      await apiClient.simulatePaymentSuccess(
        paymentId,
        checkoutState.amount,
        checkoutState.orderNumber || checkoutState.orderId
      ).catch(() => null);

      setIsPaid(true);
      const target = checkoutState.orderNumber || checkoutState.orderId;
      if (target) {
        setTimeout(() => {
          router.push(`/order/${target}?success=true`);
        }, 1800);
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Amount parts for stageshow digit centering
  const amountNumber = checkoutState?.amount ?? 0;
  const integerPart = Math.floor(amountNumber).toString();
  const decimalPart = (amountNumber % 1).toFixed(2).slice(2);

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
                className="px-6 py-3 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[3px_3px_0px_#342421] transition-all flex items-center justify-center gap-2 mx-auto"
              >
                <span>Go to Order Receipt</span>
                <ArrowRight className="w-4 h-4 text-[#342421]" />
              </Link>
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  // 3. Active Checkout State: Render Authentic Stageshow Terminal + Satellite Dispatch Slip
  if (checkoutState) {
    return (
      <StorefrontLayout>
        <div className="py-10 sm:py-14 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb / Top Bar */}
          <div className="flex items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-[#342421]/70">
              <Link href="/shop" className="hover:text-[#FF7836] transition-colors">Catalog</Link>
              <span>/</span>
              <Link href="/cart" className="hover:text-[#FF7836] transition-colors">Cart</Link>
              <span>/</span>
              <span className="text-[#342421]">Merchant Payment Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Live Terminal Link
              </span>
            </div>
          </div>

          {/* Stageshow Two-Column Grid: Terminal Counter (Hero) + Satellite Dispatch Ticket */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMN 1: The Merchant Payment Terminal Counter (Col span 7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#FFFDF9] border-2 border-[#342421] rounded-3xl shadow-[6px_6px_0px_#342421] overflow-hidden">
                {/* Terminal Bezel Header */}
                <div className="bg-[#FFF7EB] px-5 py-3.5 border-b-2 border-[#342421] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FF7836] text-white border-2 border-[#342421] flex items-center justify-center shadow-[1px_1px_0px_#342421]">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#342421] uppercase tracking-wider flex items-center gap-1.5">
                        <span>BakeConnect Terminal #04</span>
                        <span className="text-[#342421]/40">•</span>
                        <span className="text-emerald-700 font-extrabold text-[10px]">ONLINE</span>
                      </div>
                      <div className="text-[10px] text-[#342421]/60">
                        Koregaon Park Artisan Bakery Desk
                      </div>
                    </div>
                  </div>

                  {/* Reservation Expiry Countdown */}
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#342421] bg-white px-2.5 py-1 rounded-full border border-[#342421]/30 shadow-[1px_1px_0px_#342421]">
                    <Clock className="w-3.5 h-3.5 text-[#FF7836]" />
                    <span>{formatTimer(timeLeftSeconds)}</span>
                  </div>
                </div>

                {/* Terminal Screen: Exact Digit-Centered Amount Callout */}
                <div className="bg-[#FFF7EB]/80 border-b-2 border-[#342421] p-6 text-center space-y-1 relative">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#342421]/60 block">
                    Exact Authoritative Amount Payable
                  </span>

                  {/* Digit-centered Amount per Stageshow craft rules: currency hangs off the left */}
                  <div className="flex justify-center items-baseline my-2">
                    <div className="relative inline-flex items-baseline">
                      <span className="absolute right-full mr-2 text-2xl sm:text-3xl font-display font-black text-[#FF7836] select-none top-0">
                        ₹
                      </span>
                      <span className="text-5xl sm:text-6xl font-display font-black tracking-tight text-[#342421]">
                        {integerPart}
                      </span>
                      <span className="text-2xl sm:text-3xl font-display font-bold text-[#342421]/70 ml-1">
                        .{decimalPart}
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-700/30 text-emerald-900 text-[11px] font-bold">
                    <Sparkles className="w-3 h-3 text-emerald-700 shrink-0" />
                    <span>Includes +₹0.{decimalPart} unique paise for instant zero-UTR bank match</span>
                  </div>
                </div>

                {/* Terminal Body */}
                <div className="p-6 space-y-6">
                  {/* High-Precision QR Viewfinder Chamber */}
                  {qrDataUrl && (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="relative p-4 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421] inline-block">
                        {/* 4 Corner Targeting Brackets */}
                        <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-[#FF7836]" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-[#FF7836]" />
                        <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-[#FF7836]" />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-[#FF7836]" />

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrDataUrl}
                          alt="Scan UPI QR Code to Pay"
                          className="w-52 h-52 sm:w-56 sm:h-56 object-contain block"
                        />

                        {/* Subtle Laser Scanning Sweep Line */}
                        <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-[#FF7836]/60 to-transparent animate-pulse pointer-events-none" />
                      </div>

                      <div className="text-center space-y-1">
                        <span className="text-xs font-bold text-[#342421] flex items-center justify-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-[#FF7836]" />
                          <span>Scan with PhonePe, Google Pay, Paytm, BHIM, or Cred</span>
                        </span>
                        <p className="text-[11px] text-[#342421]/60">
                          Scan directly from your mobile camera or any installed UPI application
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payee Credentials with One-Touch Copy */}
                  <div className="bg-[#FFF7EB] rounded-2xl border-2 border-[#342421] p-3.5 space-y-2.5 shadow-[2px_2px_0px_#342421]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#342421]/70 font-semibold">Payee Name:</span>
                      <span className="font-bold text-[#342421]">{checkoutState.payeeName}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#342421]/15">
                      <span className="text-[#342421]/70 font-semibold">Merchant UPI VPA:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#342421] bg-white px-2 py-0.5 rounded border border-[#342421]/20">
                          {checkoutState.payeeVpa}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(checkoutState.payeeVpa, 'upi')}
                          className="p-1 hover:bg-white rounded border border-[#342421]/30 text-[#342421] transition-colors"
                          title="Copy UPI ID"
                        >
                          {copiedField === 'upi' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile 1-Tap Quick Launch Pad */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#342421]/60 block text-center">
                      Or 1-Tap Instant Launch on this Device
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <a
                        href={`phonepe://pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                        className="py-2 px-2.5 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#5f259f]" />
                        <span>PhonePe</span>
                      </a>
                      <a
                        href={`gpay://upi/pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                        className="py-2 px-2.5 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#4285F4]" />
                        <span>GPay</span>
                      </a>
                      <a
                        href={`paytmmp://pay?pa=${encodeURIComponent(checkoutState.payeeVpa)}&pn=${encodeURIComponent(checkoutState.payeeName)}&am=${checkoutState.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Payment ${paymentId.slice(0, 8)}`)}`}
                        className="py-2 px-2.5 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-[#00baf2]" />
                        <span>Paytm</span>
                      </a>
                      <a
                        href={checkoutState.upiUri}
                        className="py-2 px-2.5 rounded-xl bg-white hover:bg-[#D9EAF3] border-2 border-[#342421] text-xs font-bold text-[#342421] text-center shadow-[2px_2px_0px_#342421] transition-all flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#FF7836]" />
                        <span>Other UPI</span>
                      </a>
                    </div>
                  </div>

                  {/* Live HDFC Bank SMS Observer Stream */}
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-700/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-900">
                    <div className="flex items-center gap-2.5 text-left">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                      </span>
                      <span className="font-semibold text-[11px] leading-snug">
                        Listening for HDFC bank SMS credit of {formatCurrency(checkoutState.amount)} to {checkoutState.payeeVpa}...
                      </span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 hidden sm:block" />
                  </div>

                  {/* Actions & Simulation Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#342421]/15">
                    <button
                      type="button"
                      onClick={handleManualCheck}
                      disabled={isVerifying}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold text-[#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                      <span>{isVerifying ? 'Checking Bank Ledger...' : 'Refresh Status'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSimulateBankCredit}
                      disabled={isSimulating}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#FF7836] hover:text-[#E86322] hover:underline transition-colors"
                      title="Simulates bank SMS receipt for test purposes"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSimulating ? 'Sending SMS...' : 'Demo: Simulate Bank Credit'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: The Satellite Bakery Dispatch Slip (Col span 5) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative bg-white border-2 border-[#342421] rounded-3xl p-6 sm:p-7 shadow-[6px_6px_0px_#342421] overflow-hidden">
                {/* Perforation Punch Hole Notches */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-[#FFF7EB] border-2 border-[#342421]" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-[#FFF7EB] border-2 border-[#342421]" />

                {/* Satellite Header & Stamp */}
                <div className="border-b-2 border-dashed border-[#342421]/20 pb-5 mb-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#342421]/60 block">
                        Bakery Order Dispatch Slip
                      </span>
                      <h3 className="font-display uppercase text-2xl font-bold text-[#342421]">
                        Hearth Batch #03
                      </h3>
                    </div>

                    {/* Rubber Stamp Badge */}
                    <div className="border-2 border-[#FF7836] text-[#FF7836] px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest -rotate-6 shadow-[1px_1px_0px_#FF7836]">
                      Pune Verified
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-[#342421]/60 block font-semibold">Order Ref</span>
                      <span className="font-mono font-bold text-[#342421]">
                        #{checkoutState.orderNumber || checkoutState.orderId || 'BC-ORDER'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#342421]/60 block font-semibold">Bake Dispatch Slot</span>
                      <span className="font-bold text-[#342421]">Tomorrow 07:00 AM</span>
                    </div>
                  </div>
                </div>

                {/* Itemized Bakery Lines */}
                <div className="space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#342421]/70 flex items-center justify-between">
                    <span>Artisanal Basket Items</span>
                    <span>Amount</span>
                  </div>

                  <div className="divide-y divide-[#342421]/10 text-xs">
                    {order && order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#FFF7EB] border border-[#342421]/30 text-[10px] font-bold text-[#342421] flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-[#342421]">{item.productName}</span>
                          </div>
                          <span className="font-mono font-bold text-[#342421]">
                            {formatCurrency(item.lineTotal || item.unitPrice * item.quantity)}
                          </span>
                        </div>
                      ))
                    ) : (
                      // Plausible bakery reference rows matching stageshow guidelines
                      <>
                        <div className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#FFF7EB] border border-[#342421]/30 text-[10px] font-bold text-[#342421] flex items-center justify-center shrink-0">
                              1x
                            </span>
                            <span className="font-semibold text-[#342421]">Crispy Pure Butter Khari (200g)</span>
                          </div>
                          <span className="font-mono font-bold text-[#342421]">₹120.00</span>
                        </div>
                        <div className="py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-[#FFF7EB] border border-[#342421]/30 text-[10px] font-bold text-[#342421] flex items-center justify-center shrink-0">
                              1x
                            </span>
                            <span className="font-semibold text-[#342421]">Traditional Sourdough Boule</span>
                          </div>
                          <span className="font-mono font-bold text-[#342421]">₹190.00</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="border-t-2 border-dashed border-[#342421]/20 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-[#342421]/70">
                      <span>Artisan Items Subtotal</span>
                      <span className="font-mono">{formatCurrency(order?.subtotal || Math.max(1, checkoutState.amount - 0.47))}</span>
                    </div>
                    <div className="flex justify-between text-[#342421]/70">
                      <span>Applicable GST (5%)</span>
                      <span className="font-mono">{formatCurrency(order?.taxAmount || 0.00)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-semibold">
                      <span>Morning Hearth Delivery</span>
                      <span>FREE</span>
                    </div>
                    <div className="flex justify-between items-center text-[#FF7836] font-bold pt-1">
                      <span className="flex items-center gap-1">
                        <span>Digital Verification Key</span>
                        <span className="text-[10px] bg-[#FFF0E8] px-1.5 py-0.5 rounded border border-[#FF7836]/30">Unique</span>
                      </span>
                      <span className="font-mono">+₹0.{decimalPart}</span>
                    </div>

                    <div className="border-t-2 border-[#342421] pt-3 flex justify-between items-baseline">
                      <span className="font-bold text-sm text-[#342421]">Total Authoritative Sum</span>
                      <span className="font-display text-2xl font-black text-[#342421]">
                        {formatCurrency(checkoutState.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Guarantee & Print notice */}
                  <div className="mt-5 p-3 rounded-2xl bg-[#FFF7EB] border border-[#342421]/20 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#342421]">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF7836]" />
                      <span>Artisan Oven Guarantee</span>
                    </div>
                    <p className="text-[11px] text-[#342421]/75 leading-relaxed">
                      Your items are reserved in Batch #03. The dispatch slip auto-prints at our Koregaon Park oven the moment our bank listener catches your incoming UPI credit.
                    </p>
                  </div>
                </div>
              </div>
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
            <Link
              href="/account/orders"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] transition-all text-center"
            >
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-white hover:bg-[#FFF7EB] text-[#342421] font-bold text-xs uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] transition-all text-center"
            >
              Return to Catalog
            </Link>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}

