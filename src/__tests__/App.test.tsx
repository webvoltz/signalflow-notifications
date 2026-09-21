import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

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

const addDocMock = vi.fn<(collectionRef: unknown, data: unknown) => Promise<{ id: string }>>();
const updateDocMock = vi.fn<(docRef: unknown, data: unknown) => Promise<void>>();
const onSnapshotMock =
  vi.fn<(collectionRef: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => () => void>();
let latestSnapshotCallback: SnapshotCallback | undefined;
let latestErrorCallback: ErrorCallback | undefined;

vi.mock('../config/firebase', () => ({
  firestore: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: (...args: Parameters<typeof addDocMock>) => addDocMock(...args),
  updateDoc: (...args: Parameters<typeof updateDocMock>) => updateDocMock(...args),
  onSnapshot: (...args: Parameters<typeof onSnapshotMock>) => onSnapshotMock(...args),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp: class {
    toMillis(): number {
      return Date.now();
    }
  },
}));

function pushSnapshot(docs: FakeDocSnapshot[], fromCache = false): void {
  act(() => {
    latestSnapshotCallback?.({ docs, metadata: { fromCache } });
  });
}

function pushError(error: Error): void {
  act(() => {
    latestErrorCallback?.(error);
  });
}

beforeEach(() => {
  addDocMock.mockReset();
  updateDocMock.mockReset();
  onSnapshotMock.mockReset();
  onSnapshotMock.mockImplementation((_collectionRef, onNext, onError) => {
    latestSnapshotCallback = onNext;
    latestErrorCallback = onError;
    onNext({ docs: [], metadata: { fromCache: false } });
    return vi.fn();
  });
});

describe('App', () => {
  it('shows a loading screen before the first snapshot arrives', async () => {
    onSnapshotMock.mockImplementationOnce((_collectionRef, onNext, onError) => {
      latestSnapshotCallback = onNext;
      latestErrorCallback = onError;
      return vi.fn();
    });

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent(/Connecting to Firestore/i);

    pushSnapshot([]);

    expect(
      await screen.findByRole('heading', { name: /SignalFlow Notifications/i }),
    ).toBeInTheDocument();
  });

  it('shows the header, summary cards, and empty state once loaded with no notifications', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /SignalFlow Notifications/i })).toBeInTheDocument();
    expect(screen.getByText('Realtime connected')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Notification summary/i })).toBeInTheDocument();
    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();
  });

  it('shows a connection error panel with retry, and re-subscribes when retried', () => {
    onSnapshotMock.mockImplementationOnce((_collectionRef, _onNext, onError) => {
      latestErrorCallback = onError;
      return vi.fn();
    });

    render(<App />);
    pushError(new Error('unavailable'));

    expect(screen.getByRole('alert')).toHaveTextContent(/npm run emulators/i);
    expect(screen.getByText('Connection error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry connection/i }));

    expect(onSnapshotMock).toHaveBeenCalledTimes(2);
  });

  it('creates a notification through the modal and shows a success toast', async () => {
    addDocMock.mockResolvedValue({ id: 'new-id' });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^Create notification$/i }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Deploy finished' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Notification sent successfully.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error toast and keeps the modal open when creation fails', async () => {
    addDocMock.mockRejectedValue(new Error('permission-denied'));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^Create notification$/i }));
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Deploy finished' } });
    fireEvent.click(screen.getByRole('button', { name: /Send notification/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Unable to send notification/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Unable to send notification/i, { exact: false })).toHaveLength(2);
    expect(screen.getByLabelText('Message')).toHaveValue('Deploy finished');
  });

  it('marks a notification as read from the list and shows a success toast', async () => {
    updateDocMock.mockResolvedValue(undefined);
    render(<App />);

    pushSnapshot([
      {
        id: 'n1',
        data: () => ({ type: 'info', message: 'Hello', read: false, createdAt: null }),
      },
    ]);

    const markAsReadButton = await screen.findByRole('button', { name: /Mark as read/i });
    fireEvent.click(markAsReadButton);

    await waitFor(() => {
      expect(screen.getByText('Notification marked as read.')).toBeInTheDocument();
    });
    expect(updateDocMock).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast when marking as read fails', async () => {
    updateDocMock.mockRejectedValue(new Error('permission-denied'));
    render(<App />);

    pushSnapshot([
      {
        id: 'n1',
        data: () => ({ type: 'info', message: 'Hello', read: false, createdAt: null }),
      },
    ]);

    const markAsReadButton = await screen.findByRole('button', { name: /Mark as read/i });
    fireEvent.click(markAsReadButton);

    expect(
      await screen.findByText('Unable to mark notification as read. Please try again.'),
    ).toBeInTheDocument();
  });

  it('recovers from a rendering error via the error boundary', () => {
    onSnapshotMock.mockImplementationOnce(() => {
      throw new Error('render-time failure');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<App />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
