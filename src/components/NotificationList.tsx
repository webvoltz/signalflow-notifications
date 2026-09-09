import { useMemo, useState } from 'react';
import type { FC } from 'react';
import type { NotificationRecord, NotificationType } from '../types/notification';
import { NOTIFICATION_TYPE_META, NOTIFICATION_TYPES } from '../utils/notificationTypeMeta';
import { countNotificationsByStatus } from '../utils/notificationCounts';
import NotificationCard from './NotificationCard';
import EmptyState from './EmptyState';

type StatusFilter = 'all' | 'unread' | 'read';
type TypeFilter = 'all' | NotificationType;

interface NotificationListProps {
  notifications: readonly NotificationRecord[];
  onMarkAsRead: (id: string) => Promise<boolean>;
  onCreateRequested: () => void;
}

const STAGGER_STEP_MS = 40;
const MAX_STAGGER_MS = 400;

/**
 * Renders the realtime notification list, newest first, as a card list
 * with client-side status/type filters. Filtering never touches
 * Firestore - it's a view over the same data useNotifications already
 * subscribed to.
 */
const NotificationList: FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onCreateRequested,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    [notifications],
  );

  const statusCounts = useMemo(() => {
    const { total, unread, read } = countNotificationsByStatus(sortedNotifications);
    return { all: total, unread, read };
  }, [sortedNotifications]);

  const filteredNotifications = useMemo(
    () =>
      sortedNotifications.filter((notification) => {
        if (statusFilter === 'unread' && notification.read) {
          return false;
        }
        if (statusFilter === 'read' && !notification.read) {
          return false;
        }
        if (typeFilter !== 'all' && notification.type !== typeFilter) {
          return false;
        }
        return true;
      }),
    [sortedNotifications, statusFilter, typeFilter],
  );

  if (sortedNotifications.length === 0) {
    return <EmptyState onCreateRequested={onCreateRequested} />;
  }

  return (
    <section className="notification-center" aria-label="Notification center">
      <div className="notification-filters">
        <div className="filter-group" role="group" aria-label="Filter by status">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-chip ${statusFilter === status ? 'is-active' : ''}`}
              aria-pressed={statusFilter === status}
              onClick={() => {
                setStatusFilter(status);
              }}
            >
              {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}{' '}
              <span className="filter-chip-count">{statusCounts[status]}</span>
            </button>
          ))}
        </div>
        <div className="filter-group" role="group" aria-label="Filter by type">
          <button
            type="button"
            className={`filter-chip ${typeFilter === 'all' ? 'is-active' : ''}`}
            aria-pressed={typeFilter === 'all'}
            onClick={() => {
              setTypeFilter('all');
            }}
          >
            All types
          </button>
          {NOTIFICATION_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={`filter-chip ${typeFilter === type ? 'is-active' : ''}`}
              aria-pressed={typeFilter === type}
              onClick={() => {
                setTypeFilter(type);
              }}
            >
              <span aria-hidden="true">{NOTIFICATION_TYPE_META[type].icon}</span>{' '}
              {NOTIFICATION_TYPE_META[type].label}
            </button>
          ))}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <p className="notification-filters-empty">No notifications match these filters.</p>
      ) : (
        <ul className="notification-card-list">
          {filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              animationDelayMs={Math.min(index * STAGGER_STEP_MS, MAX_STAGGER_MS)}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

export default NotificationList;
