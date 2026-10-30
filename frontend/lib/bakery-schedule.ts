export interface BakeryBatch {
  batchName: string;
  timeString: string;
}

/**
 * Returns the current/next upcoming fresh oven batch for BakeConnect in Pune,
 * matching authentic local neighbourhood baking shifts throughout the day.
 */
export function getBakeryBatch(date: Date = new Date()): BakeryBatch {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const schedule: Array<{ until: number; batchName: string; timeString: string }> = [
    { until: 6 * 60, batchName: 'Morning Batch', timeString: '6:00 AM' },
    { until: 7 * 60, batchName: 'Morning Batch', timeString: '7:00 AM' },
    { until: 8 * 60 + 30, batchName: 'Breakfast Batch', timeString: '8:30 AM' },
    { until: 10 * 60, batchName: 'Breakfast Batch', timeString: '10:00 AM' },
    { until: 11 * 60 + 30, batchName: 'Mid-Morning Batch', timeString: '11:30 AM' },
    { until: 13 * 60, batchName: 'Lunch Batch', timeString: '1:00 PM' },
    { until: 14 * 60 + 30, batchName: 'Afternoon Batch', timeString: '2:30 PM' },
    { until: 16 * 60, batchName: 'Afternoon Batch', timeString: '4:00 PM' },
    { until: 17 * 60 + 30, batchName: 'Evening Chai Batch', timeString: '5:30 PM' },
    { until: 19 * 60, batchName: 'Evening Batch', timeString: '7:00 PM' },
    { until: 20 * 60 + 30, batchName: 'Dinner Batch', timeString: '8:30 PM' },
    { until: 22 * 60, batchName: 'Night Batch', timeString: '10:00 PM' },
  ];

  for (const slot of schedule) {
    if (currentMinutes < slot.until) {
      return { batchName: slot.batchName, timeString: slot.timeString };
    }
  }

  // After 22:00 (10 PM), next batch is tomorrow's first 6:00 AM morning batch
  return { batchName: 'Morning Batch', timeString: '6:00 AM' };
}
