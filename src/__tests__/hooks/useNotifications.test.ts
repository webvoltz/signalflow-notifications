import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationRecord } from '../../types/notification';
import type { NotificationsSnapshotMeta } from '../../services/notificationService';

type SubscribeCallback = (
  notifications: NotificationRecord[],
  meta: NotificationsSnapshotMeta,
) => void;
type ErrorCallback = (error: Error) => void;

const subscribeMock = vi.fn<(onData: SubscribeCallback, onError: ErrorCallback) => () => void>();
const createNotificationMock = vi.fn<(type: string, message: string) => Promise<string>>();
const markNotificationAsReadMock = vi.fn<(id: string) => Promise<void>>();

vi.mock('../../services/notificationService', () => ({
  subscribeToNotifications: subscribeMock,
  createNotification: createNotificationMock,
  markNotificationAsRead: markNotificationAsReadMock,
}));

const { useNotifications } = await import('../../hooks/useNotifications');

const sampleNotification: NotificationRecord = {
  id: 'n1',
  type: 'info',
  message: 'Hello',
  read: false,
  createdAt: 1,
};

beforeEach(() => {
  subscribeMock.mockReset();
  createNotificationMock.mockReset();
  markNotificationAsReadMock.mockReset();
  subscribeMock.mockImplementation((onData) => {
    onData([sampleNotification], { fromCache: false });
    return vi.fn();
  });
});

describe('useNotifications', () => {
  it('does not clear loading until the subscription is confirmed by the server', () => {
    let capturedOnData: SubscribeCallback | undefined;
    subscribeMock.mockImplementation((onData) => {
      capturedOnData = onData;
      onData([], { fromCache: true });
      return vi.fn();
    });

    const { result } = renderHook(() => useNotifications());

    expect(result.current.loading).toBe(true);
    expect(result.current.connectionStatus).toBe('reconnecting');

    act(() => {
      capturedOnData?.([sampleNotification], { fromCache: false });
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.notifications).toEqual([sampleNotification]);
  });

  it('applies an optimistic read update immediately and resolves true on success', async () => {
    markNotificationAsReadMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.markAsRead('n1');
    });

    expect(success).toBe(true);
    expect(result.current.notifications[0]?.read).toBe(true);
    expect(markNotificationAsReadMock).toHaveBeenCalledWith('n1');
  });

  it('rolls back the optimistic update and resolves false when the write fails', async () => {
    markNotificationAsReadMock.mockRejectedValue(new Error('permission-denied'));
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.markAsRead('n1');
    });

    expect(success).toBe(false);
    expect(result.current.notifications[0]?.read).toBe(false);
  });

  it('rolls back only the targeted notification, leaving others untouched', async () => {
    const otherNotification: NotificationRecord = {
      id: 'n2',
      type: 'alert',
      message: 'Other',
      read: false,
      createdAt: 2,
    };
    subscribeMock.mockImplementation((onData) => {
      onData([sampleNotification, otherNotification], { fromCache: false });
      return vi.fn();
    });
    markNotificationAsReadMock.mockRejectedValue(new Error('permission-denied'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.notifications.find((n) => n.id === 'n1')?.read).toBe(false);
    expect(result.current.notifications.find((n) => n.id === 'n2')).toEqual(otherNotification);
  });

  it('leaves other notifications untouched when marking one as read', async () => {
    const otherNotification: NotificationRecord = {
      id: 'n2',
      type: 'alert',
      message: 'Other',
      read: false,
      createdAt: 2,
    };
    subscribeMock.mockImplementation((onData) => {
      onData([sampleNotification, otherNotification], { fromCache: false });
      return vi.fn();
    });
    markNotificationAsReadMock.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('n1');
    });

    expect(result.current.notifications.find((n) => n.id === 'n1')?.read).toBe(true);
    expect(result.current.notifications.find((n) => n.id === 'n2')).toEqual(otherNotification);
  });

  it('surfaces subscription errors, sets connectionStatus to error, and stops loading', async () => {
    subscribeMock.mockImplementation((_onData, onError) => {
      onError(new Error('unavailable'));
      return vi.fn();
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.connectionStatus).toBe('error');
    expect(result.current.connectionError).toContain('npm run emulators');
    expect(result.current.notifications).toEqual([]);
  });

  it('resolves true when a notification is created successfully', async () => {
    createNotificationMock.mockResolvedValue('new-id');
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.sendNotification('info', 'Hello there');
    });

    expect(success).toBe(true);
    expect(createNotificationMock).toHaveBeenCalledWith('info', 'Hello there');
  });

  it('resolves false without touching the notification list when creation fails', async () => {
    createNotificationMock.mockRejectedValue(new Error('quota-exceeded'));
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.sendNotification('alert', 'Uh oh');
    });

    expect(success).toBe(false);
    expect(result.current.notifications).toEqual([sampleNotification]);
  });

  it('retryConnection re-subscribes and reports reconnecting until confirmed', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    // The next subscribe call (triggered by retryConnection) doesn't
    // auto-resolve, so the transient "reconnecting" state is actually
    // observable instead of settling to "connected" within the same act().
    let capturedOnData: SubscribeCallback | undefined;
    subscribeMock.mockImplementation((onData) => {
      capturedOnData = onData;
      return vi.fn();
    });

    act(() => {
      result.current.retryConnection();
    });

    expect(result.current.connectionStatus).toBe('reconnecting');
    expect(result.current.connectionError).toBeNull();
    expect(subscribeMock).toHaveBeenCalledTimes(2);

    act(() => {
      capturedOnData?.([sampleNotification], { fromCache: false });
    });

    expect(result.current.connectionStatus).toBe('connected');
  });
});
