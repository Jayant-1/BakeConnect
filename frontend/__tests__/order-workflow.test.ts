import { describe, it, expect } from 'vitest';
import { apiClient } from '../lib/api/client';

describe('Order Lifecycle, Dispatch Review & Invoices', () => {
  it('should create personal B2C orders with immediate PROCESSING status', async () => {
    const order = await apiClient.createOrder({
      customerName: 'Rohit Verma',
      customerEmail: 'rohit@example.com',
      orderType: 'PERSONAL',
      paymentMethod: 'YOUPI_PG',
      totalAmount: 480,
      items: [
        {
          id: 'item-1',
          productId: 'prod-sd-01',
          productName: 'Country Artisan Sourdough Batard',
          productImage: '',
          quantity: 2,
          unitPrice: 240,
          lineTotal: 480,
        },
      ],
    });

    expect(order.id).toBeDefined();
    expect(order.orderNumber).toMatch(/^(BK|BC)-\d+/);
    expect(order.status).toBe('PROCESSING');
    expect(order.paymentStatus).toBe('PAID');
    expect(order.timeline.length).toBeGreaterThan(0);
  });

  it('should create wholesale B2B orders with PENDING review status', async () => {
    const order = await apiClient.createOrder({
      customerName: 'Cafe Roastery Procurement',
      customerEmail: 'buyer@caferoastery.com',
      orderType: 'BUSINESS',
      businessName: 'The Daily Brew Cafe',
      businessGst: '27AABCU9603R1ZM',
      paymentMethod: 'CREDIT_CYCLE',
      totalAmount: 12500,
      items: [],
    });

    expect(order.orderNumber).toMatch(/^(B2B|BC-B2B)-\d+/);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('PENDING');
  });

  it('should support admin review actions with delay presets', async () => {
    // 1. Create order
    const order = await apiClient.createOrder({
      customerName: 'Test Cafe',
      orderType: 'BUSINESS',
      totalAmount: 8500,
    });

    // 2. Admin delays order with reason preset
    const delayed = await apiClient.updateOrderStatus(order.id, {
      status: 'DELAYED',
      preset: 'STAFF_SHORTAGE',
      reason: 'Second evening shift baker on sick leave',
      newDeliveryDate: '2026-10-30T10:00:00Z',
    });

    expect(delayed.status).toBe('DELAYED');
    expect(delayed.delayPreset).toBe('STAFF_SHORTAGE');
    expect(delayed.delayReason).toContain('Second evening shift');
    expect(delayed.estimatedDeliveryDate).toBe('2026-10-30T10:00:00Z');

    // 3. Confirm order once resolved
    const confirmed = await apiClient.updateOrderStatus(order.id, {
      status: 'CONFIRMED',
    });
    expect(confirmed.status).toBe('CONFIRMED');
  });

  it('should simulate invoice settlement for wholesale credit ledger', async () => {
    const invoices = await apiClient.getRetailerInvoices();
    expect(invoices.length).toBeGreaterThan(0);

    const pendingInvoice = invoices.find((i) => i.status === 'PENDING' || i.outstandingBalance > 0);
    if (pendingInvoice) {
      const settled = await apiClient.payInvoice(pendingInvoice.id);
      expect(settled.status).toBe('PAID');
      expect(settled.outstandingBalance).toBe(0);
      expect(settled.paidAmount).toBe(settled.amount);
    }
  });

  it('should update product inventory and SKU availability', async () => {
    const products = await apiClient.getProducts();
    const target = products[0];

    const updated = await apiClient.updateProduct(target.id, {
      stockQuantity: 99,
      isAvailable: true,
    });

    expect(updated.stockQuantity).toBe(99);
    expect(updated.isAvailable).toBe(true);
  });
});
