import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToasts } from '../../hooks/useToasts';

describe('useToasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast when shown', () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.showToast('success', 'Notification sent successfully.');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      variant: 'success',
      message: 'Notification sent successfully.',
    });
  });

  it('stacks multiple toasts with distinct ids', () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.showToast('success', 'First');
      result.current.showToast('error', 'Second');
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0]?.id).not.toBe(result.current.toasts[1]?.id);
  });

  it('auto-dismisses a toast after the timeout', () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.showToast('error', 'Unable to send notification.');
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('dismisses a toast manually before the timeout', () => {
    const { result } = renderHook(() => useToasts());

    act(() => {
      result.current.showToast('success', 'Notification marked as read.');
    });
    const [toast] = result.current.toasts;
    if (toast === undefined) {
      throw new Error('Expected a toast to be present');
    }

    act(() => {
      result.current.dismissToast(toast.id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
