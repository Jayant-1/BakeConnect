'use client';

import React from 'react';
import Image from 'next/image';
import { formatCurrency } from '../../lib/utils';
import { Order, Invoice } from '../../lib/api/types';

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDocumentProps {
  order?: Order | null;
  invoice?: Invoice | null;
  // Overrides if providing standalone data:
  orderNumber?: string;
  invoiceNumber?: string;
  date?: string | Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  businessName?: string;
  businessGst?: string;
  items?: InvoiceItem[];
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
}

function formatInvoiceDate(d: string | Date | undefined): string {
  if (!d) return '16 November, 2026';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '16 November, 2026';
  return dateObj.toLocaleDateString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function InvoiceDocument(props: InvoiceDocumentProps) {
  const {
    order,
    invoice,
    notes,
  } = props;

  // Resolve fields from props or order / invoice objects
  const serialNo =
    props.invoiceNumber ||
    invoice?.invoiceNumber ||
    props.orderNumber ||
    order?.orderNumber ||
    '000001';

  const displayDate = formatInvoiceDate(
    props.date || invoice?.issuedAt || order?.createdAt
  );

  const customerName =
    props.customerName ||
    order?.customerName ||
    invoice?.retailerBusinessName ||
    order?.businessName ||
    'Studio Shodwe';

  const customerEmail =
    props.customerEmail ||
    order?.customerEmail ||
    'hello@reallygreatsite.com';

  const customerPhone =
    props.customerPhone ||
    order?.shippingAddress?.contactPhone ||
    '';

  const addressLine1 =
    props.addressLine1 ||
    order?.shippingAddress?.addressLine1 ||
    '123 Anywhere St.';

  const addressLine2 =
    props.addressLine2 ||
    order?.shippingAddress?.addressLine2 ||
    '';

  const city =
    props.city ||
    order?.shippingAddress?.city ||
    'Any City';

  const state =
    props.state ||
    order?.shippingAddress?.state ||
    '';

  const postalCode =
    props.postalCode ||
    order?.shippingAddress?.postalCode ||
    '';

  const businessGst =
    props.businessGst ||
    order?.businessGst ||
    invoice?.gstNumber ||
    '';

  // Resolve items
  const resolvedItems: InvoiceItem[] =
    props.items ||
    (order?.items && order.items.length > 0
      ? order.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        }))
      : [
          { name: 'Artisan Fresh Ladi Pav (Pack of 6)', quantity: 2, unitPrice: 40, lineTotal: 80 },
          { name: 'Pure Butter Khari (250g Box)', quantity: 1, unitPrice: 85, lineTotal: 85 },
          { name: 'Irani Walnut Mawa Cake (Slice)', quantity: 2, unitPrice: 150, lineTotal: 300 },
        ]);

  // Resolve totals
  const totalAmount =
    props.totalAmount ??
    order?.totalAmount ??
    invoice?.amount ??
    resolvedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  // Payment method
  const paymentMethod =
    props.paymentMethod ||
    (order?.paymentMethod === 'CREDIT_CYCLE'
      ? 'Net-15 Invoice Cycle'
      : order?.paymentMethod === 'YOUPI_PG'
      ? 'UPI Instant Pay'
      : order?.paymentMethod === 'COD'
      ? 'Cash on Delivery'
      : invoice
      ? 'Net-15 Commercial Credit'
      : 'Cash');

  return (
    <div
      id="bakeconnect-invoice-document"
      className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-[#E2D7C5] max-w-2xl mx-auto printable-invoice relative overflow-hidden font-sans text-[#342421]"
    >
      {/* 1. Top Bar: Logo & Serial No */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFF7EB] border border-[#342421]/20 p-1 flex items-center justify-center shrink-0">
            <Image
              src="/images/logo-icon.png"
              alt="BakeConnect Logo"
              width={28}
              height={28}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-xs uppercase tracking-wider text-[#342421]">
              BakeConnect
            </span>
            <span className="text-[10px] tracking-widest uppercase text-[#342421]/60">
              Artisanal Bakery
            </span>
          </div>
        </div>

        <div className="text-xs sm:text-sm font-semibold tracking-wider text-[#342421] font-mono">
          NO. {serialNo}
        </div>
      </div>

      {/* 2. Bold INVOICE Title */}
      <h1 className="text-4xl sm:text-5xl font-black text-[#342421] tracking-tight uppercase mb-2">
        INVOICE
      </h1>

      {/* 3. Date */}
      <div className="text-xs sm:text-sm text-[#342421] mb-8">
        <span className="font-bold">Date:</span> {displayDate}
      </div>

      {/* 4. Two Columns: Billed to & From */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8 text-xs sm:text-sm leading-relaxed text-[#342421]/85">
        {/* Billed to */}
        <div>
          <div className="font-bold text-[#342421] mb-1 text-sm">Billed to:</div>
          <div className="font-semibold text-[#342421]">{customerName}</div>
          <div>{addressLine1}</div>
          {addressLine2 && <div>{addressLine2}</div>}
          <div>
            {city}
            {state ? `, ${state}` : ''}
            {postalCode ? ` - ${postalCode}` : ''}
          </div>
          <div className="text-[#342421]/70">{customerEmail}</div>
          {customerPhone && <div className="text-[#342421]/70">{customerPhone}</div>}
          {businessGst && (
            <div className="font-mono text-xs font-semibold text-[#342421] mt-0.5">
              GSTIN: {businessGst}
            </div>
          )}
        </div>

        {/* From */}
        <div>
          <div className="font-bold text-[#342421] mb-1 text-sm">From:</div>
          <div className="font-semibold text-[#342421]">BakeConnect Artisanal Hearth</div>
          <div>12 Koregaon Park Road</div>
          <div>Pune, Maharashtra 411001, India</div>
          <div className="text-[#342421]/70">orders@bakeconnect.com</div>
          <div className="text-[#342421]/70">+91 98765 43210</div>
          <div className="font-mono text-xs font-semibold text-[#342421] mt-0.5">
            GSTIN: 27AABCU9603R1ZM
          </div>
        </div>
      </div>

      {/* 5. Items Table */}
      <div className="mb-6">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-[#EAE6E1] text-[#342421] font-semibold">
              <th className="py-2.5 px-4 rounded-l-md font-bold">Item</th>
              <th className="py-2.5 px-4 text-center font-bold">Quantity</th>
              <th className="py-2.5 px-4 text-right font-bold">Price</th>
              <th className="py-2.5 px-4 text-right rounded-r-md font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-transparent">
            {resolvedItems.map((item, idx) => (
              <tr key={idx} className="text-[#342421]">
                <td className="py-3 px-4 font-medium">{item.name}</td>
                <td className="py-3 px-4 text-center font-medium">{item.quantity}</td>
                <td className="py-3 px-4 text-right font-mono font-medium">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Divider line before Total */}
        <div className="border-t border-[#342421]/20 my-2" />

        {/* Total Row */}
        <div className="flex justify-between items-center py-2 px-4 text-sm sm:text-base font-bold text-[#342421]">
          <span className="ml-auto pr-10 sm:pr-14 font-black">Total</span>
          <span className="font-mono text-base sm:text-lg font-black text-[#342421]">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>

      {/* 6. Payment method & Note */}
      <div className="space-y-1.5 text-xs sm:text-sm text-[#342421] mb-12 sm:mb-16">
        <div>
          <span className="font-bold">Payment method:</span>{' '}
          <span className="font-medium text-[#342421]/90">{paymentMethod}</span>
        </div>
        <div>
          <span className="font-bold">Note:</span>{' '}
          <span className="text-[#342421]/80">
            {notes || 'Thank you for choosing us!'}
          </span>
        </div>
      </div>

      {/* 7. Bottom Organic Dual-Wave Curve Graphic */}
      <div className="relative -mx-8 sm:-mx-12 -mb-8 sm:-mb-12 overflow-hidden rounded-b-3xl">
        <svg
          viewBox="0 0 600 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block select-none pointer-events-none"
          preserveAspectRatio="none"
        >
          {/* Light Warm Stone Wave (Background Layer) */}
          <path
            d="M 0,160 L 0,110 C 80,110 160,125 240,145 C 340,170 440,125 520,85 C 560,65 585,45 600,25 L 600,160 Z"
            fill="#D5CCC2"
          />
          {/* Deep Crust Cocoa Wave (Foreground Layer) */}
          <path
            d="M 0,160 C 180,160 320,160 400,130 C 470,105 520,55 600,10 L 600,160 Z"
            fill="#342421"
          />
        </svg>
      </div>
    </div>
  );
}
