import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationRecord } from '../../types/notification';
import NotificationCard from '../../components/NotificationCard';

const unreadNotification: NotificationRecord = {
  id: 'n1',
  type: 'alert',
  message: 'Disk usage is high',
  read: false,
  createdAt: Date.now() - 60_000,
};

const readNotification: NotificationRecord = {
  ...unreadNotification,
  id: 'n2',
  read: true,
};

describe('NotificationCard', () => {
  it('shows the type as both an icon and a text label', () => {
    render(
      <NotificationCard
        notification={unreadNotification}
        animationDelayMs={0}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText(unreadNotification.message)).toBeInTheDocument();
  });

  it('shows an unread indicator and a mark-as-read action for an unread notification', () => {
    render(
      <NotificationCard
        notification={unreadNotification}
        animationDelayMs={0}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Mark as read/i })).toBeInTheDocument();
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('shows a static "Read" status with no action for a read notification', () => {
    render(
      <NotificationCard
        notification={readNotification}
        animationDelayMs={0}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark as read/i })).not.toBeInTheDocument();
  });

  it('shows a pending state and disables the button while marking as read', async () => {
    let resolveMarkAsRead: ((value: boolean) => void) | undefined;
    const onMarkAsRead = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveMarkAsRead = resolve;
        }),
    );

    render(
      <NotificationCard
        notification={unreadNotification}
        animationDelayMs={0}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Mark as read/i }));

    expect(await screen.findByRole('button', { name: /Updating/i })).toBeDisabled();
    expect(onMarkAsRead).toHaveBeenCalledWith('n1');

    resolveMarkAsRead?.(true);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mark as read/i })).not.toBeDisabled();
    });
  });

  it('ignores a second click while a mark-as-read request is already in flight', () => {
    const onMarkAsRead = vi.fn(() => new Promise<boolean>(() => undefined));

    render(
      <NotificationCard
        notification={unreadNotification}
        animationDelayMs={0}
        onMarkAsRead={onMarkAsRead}
      />,
    );

    const button = screen.getByRole('button', { name: /Mark as read/i });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onMarkAsRead).toHaveBeenCalledTimes(1);
  });

  it('never renders an invalid timestamp', () => {
    render(
      <NotificationCard
        notification={{ ...unreadNotification, createdAt: Number.NaN }}
        animationDelayMs={0}
        onMarkAsRead={vi.fn()}
      />,
    );

    expect(screen.getByText('Time unavailable')).toBeInTheDocument();
  });
});
