import { useCallback, useMemo, useState } from 'react';
import type { FC } from 'react';
import AppHeader from './components/AppHeader';
import ConnectionErrorPanel from './components/ConnectionErrorPanel';
import CreateNotificationModal from './components/CreateNotificationModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import NotificationList from './components/NotificationList';
import SummaryCards from './components/SummaryCards';
import ToastViewport from './components/ToastViewport';
import { useNotifications } from './hooks/useNotifications';
import { useToasts } from './hooks/useToasts';
import type { NotificationType } from './types/notification';
import { countNotificationsByStatus } from './utils/notificationCounts';
import './App.css';

const AppContent: FC = () => {
  const {
    notifications,
    loading,
    connectionStatus,
    connectionError,
    sendNotification,
    markAsRead,
    retryConnection,
  } = useNotifications();
  const { toasts, showToast, dismissToast } = useToasts();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const counts = useMemo(() => countNotificationsByStatus(notifications), [notifications]);

  const handleCreateNotification = useCallback(
    async (type: NotificationType, message: string): Promise<boolean> => {
      const success = await sendNotification(type, message);
      showToast(
        success ? 'success' : 'error',
        success
          ? 'Notification sent successfully.'
          : 'Unable to send notification. Please try again.',
      );
      return success;
    },
    [sendNotification, showToast],
  );

  const handleMarkAsRead = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await markAsRead(id);
      showToast(
        success ? 'success' : 'error',
        success
          ? 'Notification marked as read.'
          : 'Unable to mark notification as read. Please try again.',
      );
      return success;
    },
    [markAsRead, showToast],
  );

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="App">
      <AppHeader connectionStatus={connectionStatus} unreadCount={counts.unread} />

      <main className="app-main">
        <SummaryCards total={counts.total} unread={counts.unread} read={counts.read} />

        <div className="app-actions-row">
          <button type="button" className="create-notification-button" onClick={openModal}>
            Create notification
          </button>
        </div>

        {connectionStatus === 'error' && connectionError !== null ? (
          <ConnectionErrorPanel message={connectionError} onRetry={retryConnection} />
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onCreateRequested={openModal}
          />
        )}
      </main>

      {isModalOpen && (
        <CreateNotificationModal onClose={closeModal} onSubmit={handleCreateNotification} />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

const App: FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
