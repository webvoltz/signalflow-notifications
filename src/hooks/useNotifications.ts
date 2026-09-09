import { useCallback, useEffect, useState } from 'react';
import {
  createNotification,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../services/notificationService';
import type { NotificationRecord, NotificationType } from '../types/notification';
import { humanizeFirestoreError } from '../utils/humanizeFirestoreError';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'error';

export interface UseNotificationsResult {
  notifications: NotificationRecord[];
  loading: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  sendNotification: (type: NotificationType, message: string) => Promise<boolean>;
  markAsRead: (id: string) => Promise<boolean>;
  retryConnection: () => void;
}

/**
 * Owns the realtime notification list: subscribes on mount, exposes
 * loading/connection state, and applies an optimistic update (with
 * rollback) when marking a notification as read.
 *
 * Write failures (send/mark-as-read) are reported back to the caller
 * via a resolved boolean rather than shared state - the UI decides how
 * to surface those (a toast, keeping a modal open with input intact).
 * connectionStatus/connectionError is reserved for the realtime
 * subscription itself, since that's the one failure the whole page
 * needs to react to.
 */
export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('reconnecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(
      (data, meta) => {
        setNotifications(data);

        // Firestore's first snapshot is served from local cache, even
        // with no emulator/backend reachable at all - only report
        // "connected" (and clear the initial loading state) once the
        // server has actually confirmed a snapshot, so a missing
        // emulator shows "still connecting" instead of a false
        // "loaded, no notifications".
        if (!meta.fromCache) {
          setConnectionStatus('connected');
          setConnectionError(null);
          setLoading(false);
        }
      },
      (subscriptionError) => {
        setConnectionStatus('error');
        setConnectionError(humanizeFirestoreError(subscriptionError.message));
        setLoading(false);
      },
    );

    return unsubscribe;
    // retryToken has no meaning of its own - bumping it is what forces
    // this effect to tear down the old subscription and open a new one.
  }, [retryToken]);

  const retryConnection = useCallback(() => {
    setConnectionStatus('reconnecting');
    setConnectionError(null);
    setLoading(true);
    setRetryToken((token) => token + 1);
  }, []);

  const sendNotification = useCallback(
    async (type: NotificationType, message: string): Promise<boolean> => {
      try {
        await createNotification(type, message);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    let previousRead: boolean | undefined;

    setNotifications((current) =>
      current.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }
        previousRead = notification.read;
        return { ...notification, read: true };
      }),
    );

    try {
      await markNotificationAsRead(id);
      return true;
    } catch {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id && previousRead !== undefined
            ? { ...notification, read: previousRead }
            : notification,
        ),
      );
      return false;
    }
  }, []);

  return {
    notifications,
    loading,
    connectionStatus,
    connectionError,
    sendNotification,
    markAsRead,
    retryConnection,
  };
}
