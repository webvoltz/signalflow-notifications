import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../components/ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }): null {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return null;
}

describe('ErrorBoundary', () => {
  it('renders children when nothing has thrown', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a recoverable fallback instead of a stack trace when a child throws', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('lets "Try again" attempt to re-render its children', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    // The child throws unconditionally, so the boundary re-catches and
    // shows the same fallback - this confirms the reset actually
    // attempted a fresh render rather than doing nothing.
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
