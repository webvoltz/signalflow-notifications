import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ConfigErrorScreen from '../../components/ConfigErrorScreen';

describe('ConfigErrorScreen', () => {
  it('shows the failure message and how to fix it', () => {
    render(<ConfigErrorScreen message="Invalid application configuration." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid application configuration.');
    expect(screen.getAllByText(/\.env\.example/).length).toBeGreaterThan(0);
    expect(screen.getByText('cp .env.example .env && npm run dev')).toBeInTheDocument();
  });
});
