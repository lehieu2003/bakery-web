import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Order } from '@/types/api.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

const getOrderByNumber = vi.fn();

vi.mock('@/services/order.service', () => ({
  orderService: {
    getOrderByNumber: (...args: unknown[]) => getOrderByNumber(...args),
  },
}));

import OrderDetailScreen from '@/components/screens/OrderDetailScreen';

function buildOrder(overrides?: Partial<Order>): Order {
  return {
    id: 'o1',
    orderNumber: 'BK260930TEST',
    userId: 'u1',
    customerName: 'Lan Nguyen',
    customerPhone: '0909123456',
    customerEmail: null,
    customerAddress: '123 Nguyen Trai, Quan 1, TP.HCM',
    status: 'CONFIRMED',
    subtotal: 200000,
    deliveryFee: 30000,
    discount: 10000,
    total: 220000,
    paymentMethod: 'COD',
    orderItems: [
      {
        id: 'oi1',
        orderId: 'o1',
        productId: 'p1',
        variantId: null,
        name: 'Rose Garden Birthday Cake - Medium',
        quantity: 2,
        price: 100000,
        subtotal: 200000,
        message: 'Happy Birthday',
      },
    ],
    pickupDate: '2026-10-05T00:00:00.000Z',
    createdAt: '2026-09-30T10:00:00.000Z',
    ...overrides,
  } as Order;
}

describe('OrderDetailScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderWithClient(ui: React.ReactElement) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    );
  }

  test('renders order heading, status, items, and totals', async () => {
    getOrderByNumber.mockResolvedValue(buildOrder());
    renderWithClient(<OrderDetailScreen orderNumber="BK260930TEST" />);

    expect(await screen.findByText('#BK260930TEST')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/Rose Garden Birthday Cake - Medium × 2/)).toBeInTheDocument();
    expect(screen.getByText(/Happy Birthday/)).toBeInTheDocument();
    expect(screen.getByText('30.000đ')).toBeInTheDocument(); // delivery fee, formatted
    expect(screen.getByText('220.000đ')).toBeInTheDocument(); // total
    expect(screen.getByText(/123 Nguyen Trai, Quan 1, TP.HCM/)).toBeInTheDocument();
    expect(screen.getByText(/10\/2026/)).toBeInTheDocument(); // pickup date October (vi-VN, TZ-agnostic)
  });

  test('shows a not-found state when the fetch fails', async () => {
    getOrderByNumber.mockRejectedValue(new Error('Order not found'));
    renderWithClient(<OrderDetailScreen orderNumber="BK-GONE" />);

    expect(await screen.findByText(/Order not found/i)).toBeInTheDocument();
  });
});
