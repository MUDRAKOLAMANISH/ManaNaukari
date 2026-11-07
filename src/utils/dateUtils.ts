/**
 * Asia/Kolkata (IST, UTC+5:30) Date Utilities
 * Standardized date boundary and parsing helpers for ManaCarrier
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Safely parses any date string, Date object, or number into UTC milliseconds.
 * Handles ISO strings, timestamps, and legacy PG timestamp strings without timezone offsets.
 */
export function parseToUtcMs(dateInput: string | Date | number | null | undefined): number | null {
  if (dateInput === null || dateInput === undefined) return null;
  if (typeof dateInput === 'number') {
    return isNaN(dateInput) ? null : dateInput;
  }
  if (dateInput instanceof Date) {
    const time = dateInput.getTime();
    return isNaN(time) ? null : time;
  }
  
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;

    // If timestamp string lacks offset/Z (e.g., '2026-10-21 14:30:00' or '2026-10-21T14:30:00'),
    // treat as UTC by appending 'Z' if no timezone offset exists.
    let isoStr = trimmed;
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(trimmed)) {
      if (!/[Zz]|\+[0-9]{2}:?[0-9]{2}|-[0-9]{2}:?[0-9]{2}$/.test(trimmed)) {
        isoStr = trimmed.replace(' ', 'T') + 'Z';
      }
    }
    const parsed = new Date(isoStr).getTime();
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Converts a UTC timestamp to Asia/Kolkata calendar components.
 */
function getISTComponents(refDate: Date = new Date()) {
  const utcMs = refDate.getTime();
  const istMs = utcMs + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    date: istDate.getUTCDate(),
    dayOfWeek: istDate.getUTCDay(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  };
}

/**
 * Converts IST calendar components back to an absolute UTC Date object.
 */
function istComponentsToDate(year: number, month: number, date: number): Date {
  const utcMs = Date.UTC(year, month, date, 0, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(utcMs);
}

/**
 * Start of Today in Asia/Kolkata (00:00:00.000 IST)
 */
export function getISTStartOfToday(refDate: Date = new Date()): Date {
  const { year, month, date } = getISTComponents(refDate);
  return istComponentsToDate(year, month, date);
}

/**
 * Start of Next Day in Asia/Kolkata (Tomorrow 00:00:00.000 IST)
 */
export function getISTStartOfNextDay(refDate: Date = new Date()): Date {
  const { year, month, date } = getISTComponents(refDate);
  return istComponentsToDate(year, month, date + 1);
}

/**
 * Start of Current Calendar Week (Monday 00:00:00.000 IST)
 */
export function getISTStartOfWeek(refDate: Date = new Date()): Date {
  const { year, month, date, dayOfWeek } = getISTComponents(refDate);
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return istComponentsToDate(year, month, date - diffToMonday);
}

/**
 * Start of Next Calendar Week (Next Monday 00:00:00.000 IST)
 */
export function getISTStartOfNextWeek(refDate: Date = new Date()): Date {
  const startOfWeek = getISTStartOfWeek(refDate);
  const { year, month, date } = getISTComponents(startOfWeek);
  return istComponentsToDate(year, month, date + 7);
}

/**
 * Start of Current Calendar Month (1st of current month 00:00:00.000 IST)
 */
export function getISTStartOfMonth(refDate: Date = new Date()): Date {
  const { year, month } = getISTComponents(refDate);
  return istComponentsToDate(year, month, 1);
}

/**
 * Start of Next Calendar Month (1st of next month 00:00:00.000 IST)
 */
export function getISTStartOfNextMonth(refDate: Date = new Date()): Date {
  const { year, month } = getISTComponents(refDate);
  return istComponentsToDate(year, month + 1, 1);
}

/**
 * Format date in Asia/Kolkata (IST) date string (e.g. '2026-11-03')
 */
export function getISTDateString(dateInput: string | Date | number | null | undefined): string | null {
  const utcMs = parseToUtcMs(dateInput);
  if (utcMs === null) return null;
  const istDate = new Date(utcMs + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a timestamp into a human-readable string in Asia/Kolkata timezone
 */
export function formatISTDate(
  dateInput: string | Date | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  const utcMs = parseToUtcMs(dateInput);
  if (utcMs === null) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(utcMs));
}
