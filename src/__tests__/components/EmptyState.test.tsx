import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from '../../components/EmptyState';

describe('EmptyState', () => {
  it('invites the user to create a notification', () => {
    const onCreateRequested = vi.fn();
    render(<EmptyState onCreateRequested={onCreateRequested} />);

    expect(screen.getByText(/No notifications yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Create your first notification/i }));

    expect(onCreateRequested).toHaveBeenCalledTimes(1);
  });
});
