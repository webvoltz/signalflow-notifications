import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConnectionErrorPanel from '../../components/ConnectionErrorPanel';

describe('ConnectionErrorPanel', () => {
  it('shows the human-readable message and retries on request', () => {
    const onRetry = vi.fn();
    render(<ConnectionErrorPanel message="Can't reach Firestore." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent("Can't reach Firestore.");

    fireEvent.click(screen.getByRole('button', { name: /Retry connection/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
