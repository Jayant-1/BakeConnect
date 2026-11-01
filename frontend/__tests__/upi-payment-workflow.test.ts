import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../lib/api/client';
import QRCode from 'qrcode';

describe('Frontend UPI Payment Integration & Dynamic Paise Workflow', () => {
  const testOrderId = 'test-ord-525';
  const testOrderNumber = 'BC-TEST-999';

  it('should initiate payment and allocate a dynamic paise platform fee (Option A)', async () => {
    const session = await apiClient.initiatePayment({
      orderId: testOrderId,
      provider: 'YOUPI_PG',
    });

    expect(session).toBeDefined();
    expect(session.paymentAttemptId).toBeDefined();
    expect(session.baseAmount).toBeGreaterThan(0);
    expect(session.platformFee).toBeGreaterThan(0);
    expect(session.platformFee).toBeLessThan(1.00); // 0.01 - 0.99 paise
    expect(Number(session.amount.toFixed(2))).toBe(
      Number(((session.baseAmount || 0) + (session.platformFee || 0)).toFixed(2))
    );
    expect(session.status).toBe('INITIATED');
    expect(session.expiresAt).toBeDefined();
  });

  it('should generate valid NPCI compliant UPI QR data URL', async () => {
    const session = await apiClient.initiatePayment({
      orderId: testOrderId,
      provider: 'YOUPI_PG',
    });

    const upiUri = `upi://pay?pa=perfectbakery@hdfcbank&pn=${encodeURIComponent(
      'Perfect Bakery Pune'
    )}&am=${session.amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(
      `Order ${testOrderNumber}`
    )}`;

    expect(upiUri).toContain('upi://pay?');
    expect(upiUri).toContain('pa=perfectbakery@hdfcbank');
    expect(upiUri).toContain(`am=${session.amount.toFixed(2)}`);

    const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 200 });
    expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('should poll and fetch payment attempt status', async () => {
    const session = await apiClient.initiatePayment({
      orderId: testOrderId,
      provider: 'YOUPI_PG',
    });

    const status = await apiClient.getPaymentStatus(session.paymentAttemptId);
    expect(status).toBeDefined();
    expect(status.id).toBe(session.paymentAttemptId);
    expect(status.status).toBe('INITIATED');
  });

  it('should explicitly cancel payment attempt to release reservation slot', async () => {
    const session = await apiClient.initiatePayment({
      orderId: testOrderId,
      provider: 'YOUPI_PG',
    });

    const cancelled = await apiClient.cancelPaymentAttempt(session.paymentAttemptId);
    expect(cancelled.status).toBe('CANCELLED');

    const verifyStatus = await apiClient.getPaymentStatus(session.paymentAttemptId);
    expect(verifyStatus.status).toBe('CANCELLED');
  });

  it('should simulate bank credit SMS confirmation and update order status', async () => {
    // 1. Create order
    const order = await apiClient.createOrder({
      customerName: 'Test Diner',
      customerEmail: 'diner@example.com',
      orderType: 'PERSONAL',
      fulfillmentType: 'DELIVERY',
      paymentMethod: 'YOUPI_PG',
      items: [],
      subtotal: 500,
      discountAmount: 0,
      taxAmount: 25,
      deliveryFee: 0,
      totalAmount: 525,
    });

    // 2. Initiate UPI payment
    const session = await apiClient.initiatePayment({
      orderId: order.id,
      provider: 'YOUPI_PG',
    });

    // 3. Simulate bank credit webhook confirmation
    await apiClient.simulatePaymentSuccess(
      session.paymentAttemptId,
      session.amount,
      order.orderNumber
    );

    // 4. Verify payment attempt is COMPLETED
    const updatedAttempt = await apiClient.getPaymentStatus(session.paymentAttemptId);
    expect(updatedAttempt.status).toBe('COMPLETED');
    expect(updatedAttempt.utr).toBeDefined();

    // 5. Verify order is now PAID and CONFIRMED
    const updatedOrder = await apiClient.getOrder(order.id);
    expect(updatedOrder).not.toBeNull();
    expect(updatedOrder?.paymentStatus).toBe('PAID');
    expect(updatedOrder?.status).toBe('CONFIRMED');
  });
});
