import { describe, it, expect } from 'vitest';
import { getBakeryBatch } from '../lib/bakery-schedule';

describe('getBakeryBatch dynamic scheduling', () => {
  it('returns Morning Batch by 6:00 AM for early dawn visits (e.g. 2:00 AM)', () => {
    const date = new Date(2026, 9, 30, 2, 0, 0); // 2:00 AM
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Morning Batch');
    expect(batch.timeString).toBe('6:00 AM');
  });

  it('returns Morning Batch by 7:00 AM for 6:15 AM visit', () => {
    const date = new Date(2026, 9, 30, 6, 15, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Morning Batch');
    expect(batch.timeString).toBe('7:00 AM');
  });

  it('returns Breakfast Batch by 8:30 AM for 7:45 AM visit', () => {
    const date = new Date(2026, 9, 30, 7, 45, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Breakfast Batch');
    expect(batch.timeString).toBe('8:30 AM');
  });

  it('returns Mid-Morning Batch by 11:30 AM for 10:15 AM visit', () => {
    const date = new Date(2026, 9, 30, 10, 15, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Mid-Morning Batch');
    expect(batch.timeString).toBe('11:30 AM');
  });

  it('returns Lunch Batch by 1:00 PM for 12:00 PM visit', () => {
    const date = new Date(2026, 9, 30, 12, 0, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Lunch Batch');
    expect(batch.timeString).toBe('1:00 PM');
  });

  it('returns Afternoon Batch by 4:00 PM for 3:00 PM visit', () => {
    const date = new Date(2026, 9, 30, 15, 0, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Afternoon Batch');
    expect(batch.timeString).toBe('4:00 PM');
  });

  it('returns Evening Chai Batch by 5:30 PM for 4:45 PM visit', () => {
    const date = new Date(2026, 9, 30, 16, 45, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Evening Chai Batch');
    expect(batch.timeString).toBe('5:30 PM');
  });

  it('returns Evening Batch by 7:00 PM for 6:15 PM visit', () => {
    const date = new Date(2026, 9, 30, 18, 15, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Evening Batch');
    expect(batch.timeString).toBe('7:00 PM');
  });

  it('returns Dinner Batch by 8:30 PM for 7:45 PM visit', () => {
    const date = new Date(2026, 9, 30, 19, 45, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Dinner Batch');
    expect(batch.timeString).toBe('8:30 PM');
  });

  it('returns Night Batch by 10:00 PM for 9:15 PM visit', () => {
    const date = new Date(2026, 9, 30, 21, 15, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Night Batch');
    expect(batch.timeString).toBe('10:00 PM');
  });

  it('returns Morning Batch by 6:00 AM for late night visit (e.g. 10:30 PM)', () => {
    const date = new Date(2026, 9, 30, 22, 30, 0);
    const batch = getBakeryBatch(date);
    expect(batch.batchName).toBe('Morning Batch');
    expect(batch.timeString).toBe('6:00 AM');
  });
});
