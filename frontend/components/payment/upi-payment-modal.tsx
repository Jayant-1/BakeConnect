'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { apiClient } from '../../lib/api/client';
import { PaymentAttempt, PaymentSession } from '../../lib/api/types-v2';
import { formatCurrency } from '../../lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  X,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  invoiceId?: string;
  baseAmount: number;
  onPaymentSuccess?: (attempt: PaymentAttempt) => void;
}

export function UpiPaymentModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  invoiceId,
  baseAmount,
  onPaymentSuccess,
}: UpiPaymentModalProps) {
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'upi' | 'amount' | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600); // 10 minutes
  const [isSuccess, setIsSuccess] = useState(false);
  const [successAttempt, setSuccessAttempt] = useState<PaymentAttempt | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const upiId = '9699197282@ibl';
  const payeeName = 'MRUNAL KAILASH JADHAV';

  // Initiate or retrieve existing payment session
  const initSession = async () => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);
    try {
      const sess = await apiClient.initiatePayment({
        orderId,
        invoiceId,
        provider: 'YOUPI_PG',
      });
      setSession(sess);

      // Compute remaining time
      if (sess.expiresAt) {
        const remaining = Math.max(
          10,
          Math.floor((new Date(sess.expiresAt).getTime() - Date.now()) / 1000)
        );
        setTimeLeftSeconds(remaining);
      } else {
        setTimeLeftSeconds(600);
      }

      // Generate standard NPCI UPI Intent URI
      const amountStr = Number(sess.amount).toFixed(2);
      const upiUri =
        sess.paymentUrl?.startsWith('upi://')
          ? sess.paymentUrl
          : `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
              payeeName
            )}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(
              `Order ${orderNumber}`
            )}`;

      const qrCode = await QRCode.toDataURL(upiUri, {
        width: 260,
        margin: 1,
        color: {
          dark: '#342421',
          light: '#FFFDF9',
        },
      });
      setQrDataUrl(qrCode);
    } catch (err: any) {
      console.error('Failed to initiate UPI payment session:', err);
      setError(
        err?.message ||
          'Unable to initialize payment session. Please check connection or try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initSession();
    } else {
      // Clear timers on close
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setSession(null);
      setQrDataUrl(null);
    }
  }, [isOpen, orderId]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !session || isSuccess) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setError('Payment reservation expired. Please restart checkout.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, session, isSuccess]);

  // Heartbeat Polling for incoming bank SMS confirmation
  useEffect(() => {
    if (!isOpen || !session || isSuccess) return;

    const pollStatus = async () => {
      try {
        const attempt = await apiClient.getPaymentStatus(
          session.paymentAttemptId || session.id || ''
        );
        if (
          attempt.status === 'OBSERVED_SUCCESS' ||
          attempt.status === 'COMPLETED' ||
          attempt.status === 'SUCCESS' ||
          attempt.status === 'PAID'
        ) {
          setIsSuccess(true);
          setSuccessAttempt(attempt);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          // Invoke callback after showing celebration UI
          setTimeout(() => {
            onPaymentSuccess?.(attempt);
          }, 1800);
        } else if (
          attempt.status === 'CANCELLED' ||
          attempt.status === 'EXPIRED' ||
          attempt.status === 'FAILED'
        ) {
          setError(`Payment session ${attempt.status.toLowerCase()}.`);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        // Transient network error during polling, keep polling
        console.warn('Poll payment status transient error:', err);
      }
    };

    pollIntervalRef.current = setInterval(pollStatus, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, session, isSuccess, onPaymentSuccess]);

  const handleCopy = (text: string, field: 'upi' | 'amount') => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancel = async () => {
    if (!session) {
      onClose();
      return;
    }
    setIsCancelling(true);
    try {
      await apiClient.cancelPaymentAttempt(
        session.paymentAttemptId || session.id || ''
      );
    } catch (e) {
      console.warn('Failed to explicitly cancel attempt:', e);
    } finally {
      setIsCancelling(false);
      onClose();
    }
  };

  const handleSimulateBankCredit = async () => {
    if (!session) return;
    setIsSimulating(true);
    try {
      await apiClient.simulatePaymentSuccess(
        session.paymentAttemptId || session.id || '',
        session.amount,
        orderNumber
      );
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const totalAmount = session?.amount ?? (baseAmount + 0.37);
  const dynamicFee = session?.platformFee ?? (totalAmount - baseAmount);
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(
    upiId
  )}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount.toFixed(
    2
  )}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#342421]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl border-2 border-[#342421] shadow-[6px_6px_0px_#342421] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#FFF7EB] px-6 py-4 border-b-2 border-[#342421] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF7836] text-white border-2 border-[#342421] flex items-center justify-center shadow-[1px_1px_0px_#342421]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#342421]/70">
                Direct UPI Checkout
              </div>
              <div className="text-sm font-bold text-[#342421]">
                Order #{orderNumber}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="w-8 h-8 rounded-full bg-white border-2 border-[#342421] hover:bg-rose-50 flex items-center justify-center text-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="animate-spin w-8 h-8 border-4 border-[#FF7836] border-t-transparent rounded-full mx-auto" />
              <div className="text-xs font-bold text-[#342421]">
                Generating Dynamic Verification Key...
              </div>
              <p className="text-[11px] text-[#342421]/60">
                Allocating dedicated paise slot to guarantee zero payment collisions.
              </p>
            </div>
          ) : isSuccess ? (
            /* Success State */
            <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-[#342421] text-emerald-800 flex items-center justify-center mx-auto shadow-[3px_3px_0px_#342421]">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-[#342421]">
                  Payment Verified!
                </h3>
                <p className="text-xs text-[#342421]/70 mt-1">
                  Instant bank credit confirmed via automated Google Messages observer.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#342421]/60">Amount Paid:</span>
                  <span className="font-bold text-[#342421]">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                {successAttempt?.utr && (
                  <div className="flex justify-between">
                    <span className="text-[#342421]/60">Bank Ref (UTR):</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {successAttempt.utr}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#342421]/60">Receiving VPA:</span>
                  <span className="font-mono text-[#342421]">{upiId}</span>
                </div>
              </div>

              <div className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Hearth batch scheduled! Updating order timeline...</span>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-100 border-2 border-[#342421] text-rose-700 flex items-center justify-center mx-auto shadow-[3px_3px_0px_#342421]">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#342421]">
                  Payment Session Interrupted
                </h3>
                <p className="text-xs text-rose-700 mt-1">{error}</p>
              </div>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  type="button"
                  onClick={initSession}
                  className="px-4 py-2 rounded-full bg-[#FF7836] text-white text-xs font-bold border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                  <span>Retry Session</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-full bg-white text-[#342421] text-xs font-bold border-2 border-[#342421] shadow-[2px_2px_0px_#342421]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Active QR & Payment State */
            <>
              {/* Dynamic Amount Banner (Option A) */}
              <div className="p-4 rounded-2xl bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-center space-y-1">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#342421]/60">
                  Total Payable via UPI
                </div>
                <div className="text-3xl font-display font-extrabold text-[#342421] tracking-tight">
                  {formatCurrency(totalAmount)}
                </div>

                {/* Fee Breakdown */}
                <div className="pt-2 border-t border-[#342421]/15 flex items-center justify-center gap-3 text-[11px] text-[#342421]/70">
                  <span>Order Total: <strong>{formatCurrency(baseAmount)}</strong></span>
                  <span>•</span>
                  <span>Verification Fee: <strong className="text-[#FF7836]">+{formatCurrency(dynamicFee)}</strong></span>
                </div>
              </div>

              {/* Exact Paise Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <strong>Pay exact amount with paise:</strong> The fractional paise (+₹{dynamicFee.toFixed(2)}) is your unique digital transaction signature. It allows our automated bank observer to instantly confirm your payment without delay.
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center pt-1">
                <div className="relative p-3 bg-white rounded-2xl border-2 border-[#342421] shadow-[4px_4px_0px_#342421]">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`UPI QR code for exact payment of ${formatCurrency(totalAmount)}`}
                      className="w-52 h-52 block object-contain"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center bg-cream-subtle">
                      <div className="animate-spin w-6 h-6 border-2 border-[#342421] border-t-transparent rounded-full" />
                    </div>
                  )}

                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#342421] text-white text-[9px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border border-white">
                    Scan with any UPI App
                  </div>
                </div>

                {/* Reservation Expiry Countdown */}
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#342421]/70">
                  <Clock className="w-3.5 h-3.5 text-[#FF7836]" />
                  <span>Slot reserved for:</span>
                  <span className="font-mono font-bold text-[#FF7836] bg-[#FFF7EB] px-2 py-0.5 rounded-md border border-[#342421]/20">
                    {formatTimer(timeLeftSeconds)}
                  </span>
                </div>
              </div>

              {/* Copyable Details */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#342421]/20">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-[#342421]/60 block font-bold">UPI ID (VPA)</span>
                    <span className="font-mono font-bold text-[#342421] truncate">{upiId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(upiId, 'upi')}
                    className="p-1.5 rounded-lg border border-[#342421]/20 hover:bg-[#FFF7EB] text-[#342421] transition-colors shrink-0"
                    title="Copy UPI ID"
                  >
                    {copiedField === 'upi' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#342421]/20">
                  <div className="truncate mr-2">
                    <span className="text-[10px] text-[#342421]/60 block font-bold">Exact Payable Amount</span>
                    <span className="font-mono font-bold text-[#342421] text-sm">
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(totalAmount.toFixed(2), 'amount')}
                    className="p-1.5 rounded-lg border border-[#342421]/20 hover:bg-[#FFF7EB] text-[#342421] transition-colors shrink-0"
                    title="Copy exact amount"
                  >
                    {copiedField === 'amount' ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Direct Open in Full YOUPI PG Portal */}
              {session?.checkoutUrl && (
                <div className="pt-2">
                  <a
                    href={session.checkoutUrl}
                    className="w-full py-2.5 px-4 rounded-full bg-[#FF7836] hover:bg-[#FF6A1F] text-white text-xs font-bold uppercase tracking-wider border-2 border-[#342421] shadow-[2px_2px_0px_#342421] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Proceed to YOUPI Payment Gateway</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Mobile Deep Links */}
              <div className="pt-2">
                <div className="text-[10px] uppercase font-bold text-[#342421]/60 text-center mb-2">
                  Or pay directly on this device
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={upiIntentUrl}
                    className="py-2 px-3 rounded-full bg-white hover:bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold text-[#342421] text-center flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#FF7836]" />
                    <span>Open UPI App</span>
                  </a>

                  <a
                    href={`phonepe://pay?pa=${encodeURIComponent(
                      upiId
                    )}&pn=${encodeURIComponent(payeeName)}&am=${totalAmount.toFixed(
                      2
                    )}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`}
                    className="py-2 px-3 rounded-full bg-white hover:bg-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-xs font-bold text-[#342421] text-center flex items-center justify-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>PhonePe / GPay</span>
                  </a>
                </div>
              </div>

              {/* Heartbeat Status Indicator */}
              <div className="p-3 rounded-xl bg-cream-base border border-[#342421]/20 flex items-center justify-between text-xs text-[#342421]/70">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-medium">
                    Autonomous bank observation active on 9699197282@ibl...
                  </span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              </div>

              {/* Simulation Mode button (Dev / Demo convenience) */}
              <div className="pt-1 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={handleSimulateBankCredit}
                  disabled={isSimulating}
                  className="text-xs text-[#FF7836] hover:underline font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isSimulating ? 'Simulating SMS...' : 'Demo: Simulate Bank Credit SMS'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="text-[#342421]/60 hover:text-rose-700 hover:underline font-medium"
                >
                  {isCancelling ? 'Releasing slot...' : 'Cancel & Free Slot'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
