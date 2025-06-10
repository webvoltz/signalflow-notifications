import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the Firebase configuration to avoid real network calls
jest.mock('./firebaseConfig', () => ({
  db: {},
}));

// Mock Firestore functions used in the app
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  onSnapshot: jest.fn((_q: unknown, cb: (snapshot: { docs: unknown[] }) => void) => {
    cb({ docs: [] });
    return jest.fn();
  }),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

test('shows notifications header and send button', () => {
  render(<App />);
  expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Send info/i })).toBeInTheDocument();
});
