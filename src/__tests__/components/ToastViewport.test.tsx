import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ToastViewport from '../../components/ToastViewport';

describe('ToastViewport', () => {
  it('renders each toast with the right role for its variant', () => {
    render(
      <ToastViewport
        toasts={[
          { id: 't1', variant: 'success', message: 'Notification sent successfully.' },
          { id: 't2', variant: 'error', message: 'Unable to send notification.' },
        ]}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Notification sent successfully.');
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to send notification.');
  });

  it('calls onDismiss with the toast id when its dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <ToastViewport
        toasts={[{ id: 't1', variant: 'success', message: 'Done.' }]}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Dismiss notification/i }));

    expect(onDismiss).toHaveBeenCalledWith('t1');
  });
});
