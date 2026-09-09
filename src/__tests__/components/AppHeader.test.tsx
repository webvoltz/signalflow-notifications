import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppHeader from '../../components/AppHeader';

describe('AppHeader', () => {
  it('shows a friendly connected status and no badge when nothing is unread', () => {
    render(<AppHeader connectionStatus="connected" unreadCount={0} />);

    expect(screen.getByText('Realtime connected')).toBeInTheDocument();
    expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
  });

  it('shows a connecting status', () => {
    render(<AppHeader connectionStatus="reconnecting" unreadCount={0} />);

    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('shows an error status without exposing raw error details', () => {
    render(<AppHeader connectionStatus="error" unreadCount={0} />);

    expect(screen.getByText('Connection error')).toBeInTheDocument();
  });

  it('shows the unread badge when there are unread notifications', () => {
    render(<AppHeader connectionStatus="connected" unreadCount={3} />);

    expect(screen.getByText('3 unread')).toBeInTheDocument();
  });
});
