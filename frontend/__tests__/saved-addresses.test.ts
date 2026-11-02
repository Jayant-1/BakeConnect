import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient } from '../lib/api/client';
import { Address } from '../lib/api/types';

describe('Saved Addresses & Checkout Delivery Integration', () => {
  beforeEach(() => {
    // Clear localStorage mockup if running in DOM environment
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('should load initial saved addresses with a default delivery location', async () => {
    const addresses = await apiClient.getAddresses();
    expect(Array.isArray(addresses)).toBe(true);
    expect(addresses.length).toBeGreaterThan(0);

    const defaultAddr = addresses.find((a) => a.isDefault);
    expect(defaultAddr).toBeDefined();
    expect(defaultAddr?.city).toBe('Pune');
    expect(defaultAddr?.postalCode).toMatch(/^\d{6}$/);
  });

  it('should create a new address and persist it in address book', async () => {
    const newAddrData = {
      type: 'SHIPPING' as const,
      contactName: 'Ananya Sharma',
      contactPhone: '9890123456',
      addressLine1: 'Bungalow 7, Aundh Gaon Road',
      addressLine2: 'Near Westend Mall',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411007',
      deliveryInstructions: 'Leave with security guard',
      isDefault: true,
    };

    const created = await apiClient.createAddress(newAddrData);
    expect(created.id).toBeDefined();
    expect(created.contactName).toBe('Ananya Sharma');
    expect(created.postalCode).toBe('411007');
    expect(created.isDefault).toBe(true);

    const all = await apiClient.getAddresses();
    const found = all.find((a) => a.id === created.id);
    expect(found).toBeDefined();
    expect(found?.isDefault).toBe(true);

    // Other addresses should not be default anymore
    const otherDefaults = all.filter((a) => a.id !== created.id && a.isDefault);
    expect(otherDefaults.length).toBe(0);
  });

  it('should allow setting an existing address as default', async () => {
    const addresses = await apiClient.getAddresses();
    expect(addresses.length).toBeGreaterThanOrEqual(2);

    const nonDefault = addresses.find((a) => !a.isDefault) || addresses[1];
    const updated = await apiClient.setDefaultAddress(nonDefault.id);

    expect(updated.isDefault).toBe(true);

    const all = await apiClient.getAddresses();
    const currentDefault = all.find((a) => a.isDefault);
    expect(currentDefault?.id).toBe(nonDefault.id);
  });

  it('should update an address with new landmark and instructions', async () => {
    const addresses = await apiClient.getAddresses();
    const target = addresses[0];

    const updated = await apiClient.updateAddress(target.id, {
      addressLine2: 'Opposite Starbucks, North Main Road',
      deliveryInstructions: 'Call on arrival at the gate',
    });

    expect(updated.addressLine2).toBe('Opposite Starbucks, North Main Road');
    expect(updated.deliveryInstructions).toBe('Call on arrival at the gate');
  });

  it('should delete an address and promote another default if default was deleted', async () => {
    const created = await apiClient.createAddress({
      type: 'SHIPPING',
      contactName: 'Temporary Address',
      contactPhone: '9820000000',
      addressLine1: 'Suite 101, Test Lane',
      city: 'Pune',
      state: 'Maharashtra',
      postalCode: '411001',
      isDefault: true,
    });

    await apiClient.deleteAddress(created.id);
    const afterDelete = await apiClient.getAddresses();
    const exists = afterDelete.find((a) => a.id === created.id);
    expect(exists).toBeUndefined();

    if (afterDelete.length > 0) {
      const hasDefault = afterDelete.some((a) => a.isDefault);
      expect(hasDefault).toBe(true);
    }
  });
});
