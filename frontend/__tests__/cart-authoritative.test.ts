import { describe, it, expect } from 'vitest';
import { apiClient } from '../lib/api/client';
import { MOCK_PRODUCTS } from '../lib/api/mock-data';

describe('Server-Authoritative Cart Calculation & Pricing', () => {
  const batard = MOCK_PRODUCTS.find((p) => p.id === 'prod-sd-01')!;
  const croissant = MOCK_PRODUCTS.find((p) => p.id === 'prod-vn-01')!;

  it('should compute B2C retail pricing accurately', async () => {
    // 1 Batard (₹240) + 1 Croissant (₹160) = ₹400
    const result = await apiClient.validateCart({
      items: [
        { productId: batard.id, quantity: 1 },
        { productId: croissant.id, quantity: 1 },
      ],
      channel: 'B2C',
    });

    expect(result.subtotal).toBe(400);
    // Subtotal 400 < 500 threshold, so delivery fee of 50 applies
    expect(result.qualifiesForFreeDelivery).toBe(false);
    expect(result.deliveryFee).toBe(50);
    expect(result.freeDeliveryThresholdRemaining).toBe(100);

    // 5% bakery GST on taxable subtotal (400 * 0.05 = 20)
    expect(result.taxAmount).toBe(20);
    expect(result.totalAmount).toBe(400 + 20 + 50); // 470
  });

  it('should grant free delivery for B2C orders above ₹500', async () => {
    // 3 Batards (3 * ₹240 = ₹720)
    const result = await apiClient.validateCart({
      items: [{ productId: batard.id, quantity: 3 }],
      channel: 'B2C',
    });

    expect(result.subtotal).toBe(720);
    expect(result.qualifiesForFreeDelivery).toBe(true);
    expect(result.deliveryFee).toBe(0);
    expect(result.freeDeliveryThresholdRemaining).toBe(0);
  });

  it('should compute B2B wholesale pricing with lower unit costs', async () => {
    // In B2B:
    // Batard wholesale price is 155 (vs 240 retail)
    // Croissant wholesale price is 95 (vs 160 retail)
    // 10 Batards (1550) + 40 Croissants (3800) = 5350
    const result = await apiClient.validateCart({
      items: [
        { productId: batard.id, quantity: 10 },
        { productId: croissant.id, quantity: 40 },
      ],
      channel: 'B2B',
      orderType: 'BUSINESS',
      businessGst: '27AABCU9603R1ZM',
    });

    expect(result.subtotal).toBe(10 * batard.wholesalePrice + 40 * croissant.wholesalePrice);
    expect(result.subtotal).toBe(1550 + 3800); // 5350

    // B2B MOQ threshold is 5,000
    expect(result.isMoqMet).toBe(true);
    expect(result.moqThresholdRemaining).toBe(0);

    // B2B qualifies for free bulk delivery
    expect(result.qualifiesForFreeDelivery).toBe(true);
    expect(result.deliveryFee).toBe(0);
  });

  it('should enforce B2B minimum order threshold when subtotal is under ₹5,000', async () => {
    // Only 2 Batards in B2B: 2 * 155 = 310
    const result = await apiClient.validateCart({
      items: [{ productId: batard.id, quantity: 2 }],
      channel: 'B2B',
    });

    expect(result.isMoqMet).toBe(false);
    expect(result.moqThresholdRemaining).toBe(5000 - 310);
  });

  it('should automatically apply wholesale tier discount rule for large volume', async () => {
    // Over ₹10,000 qualifies for BULK25 (25% off)
    const result = await apiClient.validateCart({
      items: [{ productId: batard.id, quantity: 80 }], // 80 * 155 = 12,400
      channel: 'B2B',
    });

    expect(result.subtotal).toBe(12400);
    expect(result.appliedDiscount).toBeDefined();
    expect(result.appliedDiscount?.code).toBe('BULK25');
    expect(result.discountAmount).toBe(310);
    expect(result.subtotal - result.discountAmount).toBe(12090);
    expect(result.taxAmount).toBe(604.5);
    expect(result.totalAmount).toBe(12694.5);
  });
});
