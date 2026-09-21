import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SummaryCards from '../../components/SummaryCards';

describe('SummaryCards', () => {
  it('shows total, unread, and read counts', () => {
    render(<SummaryCards total={12} unread={5} read={7} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
