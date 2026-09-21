import type { NotificationRecord } from '../types/notification';

export interface NotificationCounts {
  total: number;
  unread: number;
  read: number;
}

/** Single source of truth for what "unread"/"read" mean across the app. */
export function countNotificationsByStatus(
  notifications: readonly NotificationRecord[],
): NotificationCounts {
  return notifications.reduce(
    (counts, notification) => {
      counts.total += 1;
      if (notification.read) {
        counts.read += 1;
      } else {
        counts.unread += 1;
      }
      return counts;
    },
    { total: 0, unread: 0, read: 0 },
  );
}
