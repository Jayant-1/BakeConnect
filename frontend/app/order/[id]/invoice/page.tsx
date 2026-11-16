'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { apiClient } from '../../../../lib/api/client';
import { Order } from '../../../../lib/api/types';
import { Button } from '../../../../components/ui/button';
import { InvoiceDocument } from '../../../../components/invoice/invoice-document';

export default function OrderInvoiceStandalonePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;
      try {
        const data = await apiClient.getOrder(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order for invoice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF7EB] flex flex-col items-center justify-center p-6 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF7836] border-t-transparent rounded-full mb-3" />
        <p className="text-xs uppercase tracking-wider font-bold text-[#342421]/70">
          Generating Official Tax Invoice...
        </p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FFF7EB] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-[#342421] mb-2">Invoice Not Found</h2>
        <p className="text-xs text-[#342421]/70 mb-4">
          Could not locate order #{orderId}.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center font-medium transition-all duration-150 px-5 py-2 text-sm rounded-full min-h-[44px] bg-berry-jam text-cream-base hover:bg-berry-hover shadow-sm"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7EB] py-6 sm:py-10 px-4 sm:px-6 print:p-0 print:bg-white">
      {/* Top action bar (Hidden when printed) */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/order/${order.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#342421]/70 hover:text-[#FF7836] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Order Status</span>
        </Link>

        <Button
          variant="primary"
          size="sm"
          onClick={() => window.print()}
          className="rounded-full px-4 text-xs font-bold shadow-[2px_2px_0px_#342421] flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </Button>
      </div>

      {/* Printable Invoice Document */}
      <InvoiceDocument order={order} />
    </div>
  );
}
