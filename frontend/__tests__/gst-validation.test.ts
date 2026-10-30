import { describe, it, expect } from 'vitest';
import { validateGST, formatCurrency, formatDate } from '../lib/utils';

describe('GSTIN Validation & Financial Utils', () => {
  it('should validate valid Indian 15-character GSTIN numbers', () => {
    // Valid standard format: 2 digits state + 5 letters PAN + 4 digits PAN + 1 letter + 1 entity num + 'Z' + 1 checksum
    expect(validateGST('27AABCU9603R1ZM')).toBe(true);
    expect(validateGST('29AAAAA0000A1Z5')).toBe(true);
    expect(validateGST('07AAAAA0000A1Z5')).toBe(true);
  });

  it('should reject invalid GSTIN patterns', () => {
    expect(validateGST('')).toBe(false);
    expect(validateGST('12345')).toBe(false);
    expect(validateGST('27AABCU9603R1Z')).toBe(false); // 14 characters
    expect(validateGST('27AABCU9603R1ZMM')).toBe(false); // 16 characters
    expect(validateGST('99INVALIDGSTIN99')).toBe(false);
    expect(validateGST('27AABCU9603R1XM')).toBe(false); // missing 'Z' in 14th pos
  });

  it('should handle whitespace and lowercase gracefully', () => {
    expect(validateGST('  27aabcu9603r1zm  ')).toBe(true);
  });

  it('should format Indian Rupee currency correctly', () => {
    const formatted = formatCurrency(1250);
    expect(formatted).toContain('1,250');
    expect(formatted).toMatch(/₹|INR/);
  });

  it('should format timestamps into legible date strings', () => {
    const formatted = formatDate('2026-10-28T09:30:00Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Oct');
  });
});
