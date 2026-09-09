import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

const NOW = new Date('2026-01-01T12:00:00.000Z').getTime();

describe('formatRelativeTime', () => {
  it('reports a timestamp from moments ago as "Just now"', () => {
    expect(formatRelativeTime(NOW - 10_000, NOW)).toMatchObject({
      label: 'Just now',
      isValid: true,
    });
  });

  it('reports minutes ago, pluralized correctly', () => {
    expect(formatRelativeTime(NOW - 60_000, NOW).label).toBe('1 minute ago');
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW).label).toBe('5 minutes ago');
  });

  it('reports hours ago, pluralized correctly', () => {
    expect(formatRelativeTime(NOW - 60 * 60_000, NOW).label).toBe('1 hour ago');
    expect(formatRelativeTime(NOW - 3 * 60 * 60_000, NOW).label).toBe('3 hours ago');
  });

  it('reports "Yesterday" for a timestamp within the last two days', () => {
    expect(formatRelativeTime(NOW - 30 * 60 * 60_000, NOW).label).toBe('Yesterday');
  });

  it('falls back to a full date for anything older', () => {
    const result = formatRelativeTime(NOW - 5 * 24 * 60 * 60_000, NOW);
    expect(result.label).toBe(result.fullDate);
    expect(result.isValid).toBe(true);
  });

  it('clamps a timestamp slightly in the future to "Just now" instead of going negative', () => {
    expect(formatRelativeTime(NOW + 5_000, NOW).label).toBe('Just now');
  });

  it('never renders Invalid Date for a non-finite timestamp', () => {
    expect(formatRelativeTime(Number.NaN, NOW)).toEqual({
      label: 'Time unavailable',
      fullDate: 'Time unavailable',
      isValid: false,
    });
  });
});
