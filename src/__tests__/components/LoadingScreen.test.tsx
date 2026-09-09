import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoadingScreen from '../../components/LoadingScreen';

describe('LoadingScreen', () => {
  it('identifies the app while the subscription connects', () => {
    render(<LoadingScreen />);

    expect(screen.getByRole('heading', { name: /SignalFlow Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Connecting to Firestore/i);
    expect(screen.queryByText(/Taking a while\?/i)).not.toBeInTheDocument();
  });

  describe('after a delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows a hint pointing at the Firestore emulator', () => {
      render(<LoadingScreen />);

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(screen.getByText(/Taking a while\?/i)).toBeInTheDocument();
    });
  });
});
