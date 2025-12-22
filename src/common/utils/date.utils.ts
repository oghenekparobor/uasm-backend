/**
 * Get the Sunday date for a given date
 * Returns the date of the Sunday of that week
 */
export function getSundayDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  return new Date(d.setDate(diff));
}

/**
 * Check if a date is within a time window
 */
export function isWithinTimeWindow(
  date: Date,
  opensAt: Date,
  closesAt: Date,
): boolean {
  const now = new Date(date);
  return now >= opensAt && now <= closesAt;
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

