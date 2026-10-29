import React from 'react';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';

import OrderStatusStepper from '@/components/orders/OrderStatusStepper';

function stepStates() {
  return screen
    .getAllByRole('listitem')
    .map((item) => item.getAttribute('data-state'));
}

describe('OrderStatusStepper', () => {
  test('ticks every step up to the current status', () => {
    render(<OrderStatusStepper status='PROCESSING' />);

    expect(stepStates()).toEqual([
      'done',
      'done',
      'done',
      'upcoming',
      'upcoming',
    ]);
    expect(
      screen.getByText('Chuẩn bị').closest('li')?.getAttribute('aria-current'),
    ).toBe('step');
    // Upcoming steps show their number instead of a tick.
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  test('a new order has only the first step done', () => {
    render(<OrderStatusStepper status='PENDING' />);
    expect(stepStates()).toEqual([
      'done',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  test('a completed order has every step done', () => {
    render(<OrderStatusStepper status='COMPLETED' />);
    expect(stepStates().every((state) => state === 'done')).toBe(true);
  });

  test('a cancelled order shows a cancelled notice instead of steps', () => {
    render(<OrderStatusStepper status='CANCELLED' />);
    expect(screen.getByText('Đơn hàng đã huỷ')).toBeTruthy();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
