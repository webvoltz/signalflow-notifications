import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NotificationRecord } from '../../types/notification';
import NotificationList from '../../components/NotificationList';

const notifications: NotificationRecord[] = [
  { id: 'older', type: 'info', message: 'Older message', read: true, createdAt: 1 },
  { id: 'newer', type: 'alert', message: 'Newer message', read: false, createdAt: 2 },
];

describe('NotificationList', () => {
  it('shows the empty state and wires its CTA when there are no notifications at all', () => {
    const onCreateRequested = vi.fn();
    render(
      <NotificationList
        notifications={[]}
        onMarkAsRead={vi.fn()}
        onCreateRequested={onCreateRequested}
      />,
    );

    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Create your first notification/i }));
    expect(onCreateRequested).toHaveBeenCalledTimes(1);
  });

  it('renders notifications newest first without mutating the input array', () => {
    const original = [...notifications];

    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('Newer message');
    expect(cards[1]).toHaveTextContent('Older message');
    expect(notifications).toEqual(original);
  });

  it('shows status filter counts', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /All 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unread 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Read 1/i })).toBeInTheDocument();
  });

  it('filters to only unread notifications', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Unread 1/i }));

    expect(screen.getByText('Newer message')).toBeInTheDocument();
    expect(screen.queryByText('Older message')).not.toBeInTheDocument();
  });

  it('filters to only read notifications', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Read 1/i }));

    expect(screen.getByText('Older message')).toBeInTheDocument();
    expect(screen.queryByText('Newer message')).not.toBeInTheDocument();
  });

  it('filters by notification type', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Info/i }));

    expect(screen.getByText('Older message')).toBeInTheDocument();
    expect(screen.queryByText('Newer message')).not.toBeInTheDocument();
  });

  it('resets the type filter back to all types', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Info/i }));
    fireEvent.click(screen.getByRole('button', { name: /All types/i }));

    expect(screen.getByText('Older message')).toBeInTheDocument();
    expect(screen.getByText('Newer message')).toBeInTheDocument();
  });

  it('shows a distinct message when filters hide every notification', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Unread 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Info/i }));

    expect(screen.getByText('No notifications match these filters.')).toBeInTheDocument();
  });

  it('only shows the mark-as-read action for unread notifications', () => {
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={vi.fn()}
        onCreateRequested={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button', { name: /Mark as read/i })).toHaveLength(1);
  });

  it('calls onMarkAsRead with the notification id when clicked', () => {
    const onMarkAsRead = vi.fn(() => new Promise<boolean>(() => undefined));
    render(
      <NotificationList
        notifications={notifications}
        onMarkAsRead={onMarkAsRead}
        onCreateRequested={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Mark as read/i }));

    expect(onMarkAsRead).toHaveBeenCalledWith('newer');
  });
});
