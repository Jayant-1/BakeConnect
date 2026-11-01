import { describe, it, expect } from 'vitest';
import { apiClient } from '../lib/api/client';
import { MOCK_PRODUCTS } from '../lib/api/mock-data';

describe('Server-Authoritative Cart Calculation & Pricing (Pune Bakery)', () => {
  const milkBread = MOCK_PRODUCTS.find((p) => p.slug === 'classic-milk-bread')!;
  const butterKhari = MOCK_PRODUCTS.find((p) => p.slug === 'pure-butter-khari')!;

  it('should compute B2C retail pricing accurately', async () => {
    // 1 Milk Bread (₹50) + 1 Khari (₹85) = ₹135
    const result = await apiClient.validateCart({
      items: [
        { productId: milkBread.id, quantity: 1 },
        { productId: butterKhari.id, quantity: 1 },
      ],
      channel: 'B2C',
    });

    expect(result.subtotal).toBe(135);
    // Subtotal 135 < 500 threshold, so delivery fee of 50 applies
    expect(result.qualifiesForFreeDelivery).toBe(false);
    expect(result.deliveryFee).toBe(50);
    expect(result.freeDeliveryThresholdRemaining).toBe(365);

    // 5% bakery GST on taxable subtotal (135 * 0.05 = 6.75)
    expect(result.taxAmount).toBe(6.75);
    expect(result.totalAmount).toBe(135 + 6.75 + 50); // 191.75
  });

  it('should grant free delivery for B2C orders above ₹500', async () => {
    // 11 Milk Breads (11 * ₹50 = ₹550)
    const result = await apiClient.validateCart({
      items: [{ productId: milkBread.id, quantity: 11 }],
      channel: 'B2C',
    });

    expect(result.subtotal).toBe(550);
    expect(result.qualifiesForFreeDelivery).toBe(true);
    expect(result.deliveryFee).toBe(0);
    expect(result.freeDeliveryThresholdRemaining).toBe(0);
  });

  it('should compute B2B wholesale pricing with lower unit costs', async () => {
    // In B2B:
    // Milk Bread wholesale price is 38 (vs 50 retail). MOQ 8, inc 4 -> 48 pieces
    // Khari wholesale price is 60 (vs 85 retail). MOQ 12, inc 6 -> 60 pieces
    // 48 Milk Bread (1824) + 60 Khari (3600) = 5424
    const result = await apiClient.validateCart({
      items: [
        { productId: milkBread.id, quantity: 48 },
        { productId: butterKhari.id, quantity: 60 },
      ],
      channel: 'B2B',
      orderType: 'BUSINESS',
      businessGst: '27AABCU9603R1ZM',
    });

    expect(result.subtotal).toBe(48 * milkBread.wholesalePrice + 60 * butterKhari.wholesalePrice);
    expect(result.subtotal).toBe(1824 + 3600); // 5424

    // B2B MOQ threshold is 5,000
    expect(result.isMoqMet).toBe(true);
    expect(result.moqThresholdRemaining).toBe(0);

    // B2B qualifies for free bulk delivery
    expect(result.qualifiesForFreeDelivery).toBe(true);
    expect(result.deliveryFee).toBe(0);
  });

  it('should enforce B2B minimum order threshold when subtotal is under ₹5,000', async () => {
    // 8 Milk Breads in B2B (meets item MOQ 8): 8 * 38 = 304
    const result = await apiClient.validateCart({
      items: [{ productId: milkBread.id, quantity: 8 }],
      channel: 'B2B',
    });

    expect(result.isMoqMet).toBe(false);
    expect(result.moqThresholdRemaining).toBe(5000 - 304);
  });

  it('should automatically apply wholesale tier discount rule for large volume', async () => {
    // Over ₹10,000 qualifies for BULK25 (2.5% off)
    // 300 Milk Bread (meets MOQ 8, inc 4): 300 * 38 = 11,400
    const result = await apiClient.validateCart({
      items: [{ productId: milkBread.id, quantity: 300 }],
      channel: 'B2B',
    });

    expect(result.subtotal).toBe(11400);
    expect(result.appliedDiscount).toBeDefined();
    expect(result.appliedDiscount?.code).toBe('BULK25');
    expect(result.discountAmount).toBe(285);
    expect(result.subtotal - result.discountAmount).toBe(11115);
    expect(result.taxAmount).toBe(555.75);
    expect(result.totalAmount).toBe(11670.75);
  });

  it('should apply special qazwsx live test coupon and cap base order total at ₹1.00', async () => {
    // 2 Milk Breads (2 * ₹50 = ₹100)
    const result = await apiClient.validateCart({
      items: [{ productId: milkBread.id, quantity: 2 }],
      channel: 'B2C',
      couponCode: 'qazwsx',
    });

    expect(result.subtotal).toBe(100);
    expect(result.appliedDiscount).toBeDefined();
    expect(result.appliedDiscount?.code).toBe('qazwsx');
    expect(result.discountAmount).toBe(99);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(1.00);
  });
});
