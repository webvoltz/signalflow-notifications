import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationRecord } from '../../types/notification';
import type { NotificationsSnapshotMeta } from '../../services/notificationService';

class FakeTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

interface FakeDocSnapshot {
  id: string;
  data: () => unknown;
}

interface FakeQuerySnapshot {
  docs: FakeDocSnapshot[];
  metadata: { fromCache: boolean };
}

type SnapshotCallback = (snapshot: FakeQuerySnapshot) => void;
type ErrorCallback = (error: Error) => void;

const addDocMock =
  vi.fn<
    (collectionRef: { path: string }, data: Record<string, unknown>) => Promise<{ id: string }>
  >();
const updateDocMock = vi.fn<(docRef: unknown, data: Record<string, unknown>) => Promise<void>>();
const onSnapshotMock =
  vi.fn<(collectionRef: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => () => void>();
const collectionMock = vi.fn((_db: unknown, path: string) => ({ path }));
const docMock = vi.fn((_db: unknown, path: string, id: string) => ({ path, id }));
const serverTimestampMock = vi.fn(() => 'SERVER_TIMESTAMP_SENTINEL');

vi.mock('firebase/firestore', () => ({
  addDoc: addDocMock,
  collection: collectionMock,
  doc: docMock,
  onSnapshot: onSnapshotMock,
  serverTimestamp: serverTimestampMock,
  updateDoc: updateDocMock,
  Timestamp: FakeTimestamp,
}));

vi.mock('../../config/firebase', () => ({
  firestore: {},
}));

const { createNotification, markNotificationAsRead, subscribeToNotifications } =
  await import('../../services/notificationService');

beforeEach(() => {
  addDocMock.mockReset();
  updateDocMock.mockReset();
  onSnapshotMock.mockReset();
});

describe('createNotification', () => {
  it('writes the exact type/message/read/createdAt payload shape to Firestore', async () => {
    addDocMock.mockResolvedValue({ id: 'doc-1' });

    const id = await createNotification('alert', 'Disk usage is high');

    expect(id).toBe('doc-1');
    expect(addDocMock).toHaveBeenCalledTimes(1);

    const call = addDocMock.mock.calls[0];
    if (call === undefined) {
      throw new Error('addDoc was not called');
    }
    const [, payload] = call;
    expect(payload).toEqual({
      type: 'alert',
      message: 'Disk usage is high',
      read: false,
      createdAt: 'SERVER_TIMESTAMP_SENTINEL',
    });
  });

  it('trims the message before writing it', async () => {
    addDocMock.mockResolvedValue({ id: 'doc-1' });

    await createNotification('info', '  padded message  ');

    const call = addDocMock.mock.calls[0];
    if (call === undefined) {
      throw new Error('addDoc was not called');
    }
    const [, payload] = call;
    expect(payload['message']).toBe('padded message');
  });

  it('rejects a whitespace-only message before ever reaching Firestore', async () => {
    await expect(createNotification('info', '   ')).rejects.toThrow();

    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('rejects a message over the maximum length before ever reaching Firestore', async () => {
    await expect(createNotification('info', 'x'.repeat(501))).rejects.toThrow();

    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('propagates Firestore write failures to the caller', async () => {
    addDocMock.mockRejectedValue(new Error('permission-denied'));

    await expect(createNotification('info', 'Hello')).rejects.toThrow('permission-denied');
  });
});

describe('subscribeToNotifications', () => {
  it('maps snapshot documents into notification records and skips malformed ones', () => {
    const onData =
      vi.fn<(notifications: NotificationRecord[], meta: NotificationsSnapshotMeta) => void>();
    const onError = vi.fn<ErrorCallback>();
    onSnapshotMock.mockImplementation((_collectionRef, onNext) => {
      onNext({
        docs: [
          {
            id: 'valid-1',
            data: () => ({
              type: 'info',
              message: 'Hello',
              read: false,
              createdAt: new FakeTimestamp(1_700_000_000_000),
            }),
          },
          {
            id: 'pending-1',
            data: () => ({
              type: 'message',
              message: 'Still writing',
              read: false,
              createdAt: null,
            }),
          },
          {
            id: 'malformed-1',
            data: () => ({ type: 'unknown-type', message: 'Bad' }),
          },
        ],
        metadata: { fromCache: false },
      });
      return vi.fn();
    });

    subscribeToNotifications(onData, onError);

    expect(onData).toHaveBeenCalledTimes(1);
    const dataCall = onData.mock.calls[0];
    if (dataCall === undefined) {
      throw new Error('onData was not called');
    }
    const [notifications, meta] = dataCall;

    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toEqual({
      id: 'valid-1',
      type: 'info',
      message: 'Hello',
      read: false,
      createdAt: 1_700_000_000_000,
    });
    expect(notifications[1]?.id).toBe('pending-1');
    expect(typeof notifications[1]?.createdAt).toBe('number');
    expect(meta).toEqual({ fromCache: false });
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports fromCache: true for a snapshot not yet confirmed by the server', () => {
    const onData =
      vi.fn<(notifications: NotificationRecord[], meta: NotificationsSnapshotMeta) => void>();
    const onError = vi.fn<ErrorCallback>();
    onSnapshotMock.mockImplementation((_collectionRef, onNext) => {
      onNext({ docs: [], metadata: { fromCache: true } });
      return vi.fn();
    });

    subscribeToNotifications(onData, onError);

    const dataCall = onData.mock.calls[0];
    if (dataCall === undefined) {
      throw new Error('onData was not called');
    }
    const meta: NotificationsSnapshotMeta = dataCall[1];
    expect(meta.fromCache).toBe(true);
  });

  it('forwards subscription errors', () => {
    const onData =
      vi.fn<(notifications: NotificationRecord[], meta: NotificationsSnapshotMeta) => void>();
    const onError = vi.fn<ErrorCallback>();
    const subscriptionError = new Error('unavailable');
    onSnapshotMock.mockImplementation((_collectionRef, _onNext, onSnapshotError) => {
      onSnapshotError(subscriptionError);
      return vi.fn();
    });

    subscribeToNotifications(onData, onError);

    expect(onError).toHaveBeenCalledWith(subscriptionError);
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('markNotificationAsRead', () => {
  it('updates the read flag', async () => {
    updateDocMock.mockResolvedValue(undefined);

    await markNotificationAsRead('doc-1');

    expect(docMock).toHaveBeenCalledWith({}, 'notifications', 'doc-1');
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), { read: true });
  });

  it('propagates Firestore write failures to the caller', async () => {
    updateDocMock.mockRejectedValue(new Error('network-error'));

    await expect(markNotificationAsRead('doc-1')).rejects.toThrow('network-error');
  });
});
