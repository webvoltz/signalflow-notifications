const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export interface RelativeTime {
  label: string;
  fullDate: string;
  isValid: boolean;
}

/**
 * Turns an epoch-millis timestamp into a short relative label plus the
 * full date/time for a tooltip. Never renders "Invalid Date" - an
 * unusable timestamp falls back to a plain, honest label instead.
 */
export function formatRelativeTime(epochMillis: number, now: number = Date.now()): RelativeTime {
  if (!Number.isFinite(epochMillis)) {
    return { label: 'Time unavailable', fullDate: 'Time unavailable', isValid: false };
  }

  const fullDate = new Date(epochMillis).toLocaleString();
  const diffMs = Math.max(0, now - epochMillis);

  if (diffMs < MINUTE_MS) {
    return { label: 'Just now', fullDate, isValid: true };
  }

  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return {
      label: `${minutes.toString()} minute${minutes === 1 ? '' : 's'} ago`,
      fullDate,
      isValid: true,
    };
  }

  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return {
      label: `${hours.toString()} hour${hours === 1 ? '' : 's'} ago`,
      fullDate,
      isValid: true,
    };
  }

  if (isYesterday(epochMillis, now)) {
    return { label: 'Yesterday', fullDate, isValid: true };
  }

  return { label: fullDate, fullDate, isValid: true };
}

function isYesterday(epochMillis: number, now: number): boolean {
  const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfDay(now) - startOfDay(epochMillis)) / DAY_MS);
  return dayDiff === 1;
}
