'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Printer, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { InvoiceDocument, InvoiceDocumentProps } from './invoice-document';
import { apiClient } from '../../lib/api/client';
import { Order } from '../../lib/api/types';

export interface InvoiceModalProps extends InvoiceDocumentProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export function InvoiceModal({
  isOpen,
  onClose,
  orderId,
  ...docProps
}: InvoiceModalProps) {
  const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);

  const targetOrderId = orderId || docProps.order?.id || docProps.invoice?.orderId;

  useEffect(() => {
    let isMounted = true;
    if (isOpen && targetOrderId && !docProps.order) {
      apiClient.getOrder(targetOrderId).then((ord) => {
        if (isMounted && ord) {
          setLoadedOrder(ord);
        }
      }).catch((e) => console.warn('Could not load order for invoice modal:', e));
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, targetOrderId, docProps.order]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const activeOrder = docProps.order || loadedOrder;
  const resolvedOrderId = targetOrderId;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-transparent print:static print:inset-auto">
      {/* Container Card */}
      <div className="relative w-full max-w-3xl bg-[#F6EEE3] rounded-3xl border-2 border-[#342421] shadow-[6px_6px_0px_#342421] overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:max-w-none print:border-none print:shadow-none print:bg-transparent print:rounded-none">
        
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#342421] bg-[#FFF7EB] shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-[#342421]">
              Tax Invoice
            </span>
            <span className="text-xs font-mono font-medium text-[#342421]/60 px-2 py-0.5 rounded-full bg-[#EAE6E1]">
              {docProps.order?.orderNumber || docProps.invoice?.invoiceNumber || docProps.orderNumber || 'Preview'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {resolvedOrderId && (
              <Link
                href={`/order/${resolvedOrderId}/invoice`}
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#342421] bg-white border border-[#342421] hover:bg-[#FFF7EB] transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Full Page</span>
              </Link>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="rounded-full px-4 text-xs font-bold shadow-[2px_2px_0px_#342421] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </Button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border-2 border-[#342421] bg-white hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center text-[#342421] transition-colors cursor-pointer"
              aria-label="Close invoice preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible">
          <InvoiceDocument {...docProps} order={activeOrder} />
        </div>
      </div>
    </div>
  );
}
