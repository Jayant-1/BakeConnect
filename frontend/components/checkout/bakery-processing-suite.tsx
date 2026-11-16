'use client';

import React from 'react';
import {
  Flame,
  CheckCircle2,
  ShieldCheck,
  Package,
  Store,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

export interface BakeryProcessingSuiteProps {
  step?: 1 | 2 | 3 | 4;
  customMessage?: string;
  orderNumber?: string;
  totalAmount?: number;
  itemCount?: number;
  fulfillmentType?: 'DELIVERY' | 'PICKUP';
}

const STAGES = [
  {
    step: 1,
    title: 'Batch Inventory & Reservation',
    description: 'Reserving hot items from the active Koregaon Park morning hearth schedule',
    icon: Flame,
    pill: 'Ovens Hot',
  },
  {
    step: 2,
    title: 'Weighing & Quality Dispatch Seal',
    description: 'Verifying batch weights, packaging seals & Indian GST invoicing',
    icon: Package,
    pill: 'GST Verified',
  },
  {
    step: 3,
    title: 'Hearth Handshake & Payment Channel',
    description: 'Allocating zero-collision dynamic UPI verification session on 9699197282@ibl',
    icon: ShieldCheck,
    pill: 'UPI Dynamic Intent',
  },
  {
    step: 4,
    title: 'Fresh Out of the Oven',
    description: 'Order confirmed! Routing to payment counter & live fulfillment tracking',
    icon: CheckCircle2,
    pill: 'Ready for Counter',
  },
];

export function BakeryProcessingSuite({
  step = 1,
  customMessage,
  orderNumber,
  totalAmount,
  itemCount,
  fulfillmentType = 'DELIVERY',
}: BakeryProcessingSuiteProps) {
  const progressPercent = Math.min(100, Math.max(15, (step / 4) * 100));

  return (
    <div className="py-12 sm:py-16 max-w-3xl mx-auto px-4 sm:px-6">
      {/* Neo-brutalist Bakery Suite Container */}
      <div className="bg-[#FFF7EB] border-2 border-[#342421] rounded-3xl p-6 sm:p-10 shadow-[6px_6px_0px_#342421] relative overflow-hidden">
        {/* Subtle Decorative Background Motif */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#FF7836]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#D9EAF3]/30 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header & Pune Bakery Badge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-6 border-b-2 border-[#342421]/15">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D9EAF3] text-[#342421] border border-[#342421]/30 text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5 text-[#FF7836]" />
            <span>BakeConnect Hearth Kitchen • Pune</span>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#342421]/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>OVEN LINE 1 ACTIVE</span>
          </div>
        </div>

        {/* Animated Artisan Hearth Visual */}
        <div className="py-8 text-center flex flex-col items-center">
          <div className="relative mb-5">
            {/* Outer Glowing Pulsing Hearth Ring */}
            <div className="w-24 h-24 rounded-3xl bg-[#FF7836]/15 border-2 border-[#342421] shadow-[3px_3px_0px_#342421] flex items-center justify-center animate-bounce duration-1000">
              <Flame className="w-12 h-12 text-[#FF7836] animate-pulse" />
            </div>

            {/* Floating Bakery Steam Badges */}
            <div className="absolute -top-2 -right-3 px-2 py-0.5 rounded-full bg-[#342421] text-[#FFF7EB] text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#FF7836]">
              Baking
            </div>
          </div>

          <h2 className="font-display uppercase text-2xl sm:text-4xl font-bold text-[#342421] tracking-tight mb-2">
            Kneading & Baking Your Order
          </h2>

          <p className="font-sans text-sm sm:text-base text-[#342421]/75 max-w-lg mx-auto leading-relaxed">
            {customMessage ||
              'Please keep this window open while our Pune hearth kitchen logs your bakes into the morning dispatch queue.'}
          </p>

          {/* Optional Order & Amount Snapshot Card */}
          {(orderNumber || totalAmount !== undefined) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
              {orderNumber && (
                <span className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-[#342421]">
                  Order #{orderNumber}
                </span>
              )}
              {totalAmount !== undefined && (
                <span className="px-3 py-1.5 rounded-xl bg-[#342421] text-[#FFF7EB] border-2 border-[#342421] shadow-[2px_2px_0px_#FF7836]">
                  Payable: {formatCurrency(totalAmount)}
                </span>
              )}
              {itemCount !== undefined && (
                <span className="px-3 py-1.5 rounded-xl bg-white border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-[#342421]">
                  {itemCount} fresh {itemCount === 1 ? 'item' : 'items'}
                </span>
              )}
              <span className="px-3 py-1.5 rounded-xl bg-[#D9EAF3] border-2 border-[#342421] shadow-[2px_2px_0px_#342421] text-[#342421]">
                {fulfillmentType === 'PICKUP' ? 'Counter Pickup' : 'Pune Doorstep Delivery'}
              </span>
            </div>
          )}
        </div>

        {/* Animated Progress Bar */}
        <div className="my-6">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#342421]/70 mb-2">
            <span>Hearth Preparation Progress</span>
            <span className="font-mono text-[#FF7836] font-black">{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full h-3.5 bg-white border-2 border-[#342421] rounded-full overflow-hidden p-0.5 shadow-[2px_2px_0px_#342421]">
            <div
              className="h-full bg-gradient-to-r from-[#FF7836] to-[#FF9E4A] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 4-Stage Baking Progression List */}
        <div className="space-y-3 pt-2">
          {STAGES.map((s) => {
            const isCompleted = step > s.step;
            const isCurrent = step === s.step;
            const Icon = s.icon;

            return (
              <div
                key={s.step}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex items-start gap-3.5 ${
                  isCurrent
                    ? 'bg-white border-[#342421] shadow-[3px_3px_0px_#FF7836] ring-2 ring-[#FF7836]/30'
                    : isCompleted
                    ? 'bg-[#EBF7EE] border-emerald-800/40 text-[#2D211B]'
                    : 'bg-white/40 border-[#342421]/20 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : isCurrent
                      ? 'bg-[#FF7836] text-white border-[#342421] shadow-[1px_1px_0px_#342421] animate-pulse'
                      : 'bg-white text-[#342421]/50 border-[#342421]/30'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h4
                      className={`font-display uppercase text-sm sm:text-base tracking-tight ${
                        isCurrent ? 'font-bold text-[#342421]' : isCompleted ? 'text-emerald-900 font-bold' : 'text-[#342421]/70'
                      }`}
                    >
                      {s.title}
                    </h4>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isCurrent
                          ? 'bg-[#FF7836]/20 text-[#FF7836] border-[#FF7836]/50'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Queued'}
                    </span>
                  </div>
                  <p className="text-xs text-[#342421]/75 mt-0.5 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Reassurance Footer Notice */}
        <div className="mt-8 pt-4 border-t-2 border-[#342421]/15 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-[#342421]/70">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>256-Bit Encrypted Dynamic UPI Handshake • Zero Payment Gateway Markups</span>
          </div>
          <span className="font-semibold text-[#342421]">Do not refresh or click back</span>
        </div>
      </div>
    </div>
  );
}
