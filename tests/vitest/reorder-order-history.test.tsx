import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<
    { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>
  >) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/use-orders', () => ({
  useOrders: vi.fn(),
  usePrepareReorder: vi.fn(),
}));

vi.mock('@/hooks/use-auth', () => ({
  useLogout: vi.fn(),
  useUpdateProfile: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(),
}));

import ProfileScreen from '@/components/screens/ProfileScreen';
import { useOrders, usePrepareReorder } from '@/hooks/use-orders';
import { useLogout, useUpdateProfile } from '@/hooks/use-auth';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/lib/cart-store';

const mockedUseOrders = vi.mocked(useOrders);
const mockedUsePrepareReorder = vi.mocked(usePrepareReorder);
const mockedUseLogout = vi.mocked(useLogout);
const mockedUseUpdateProfile = vi.mocked(useUpdateProfile);
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseCart = vi.mocked(useCart);

describe('Order history quick reorder', () => {
  const mutateAsync = vi.fn();
  const replaceCart = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    replaceCart.mockReset();

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'member@example.com',
        name: 'Member',
        memberLevel: 'GOLD',
        points: 450,
      },
      logout: vi.fn(),
      setUser: vi.fn(),
    } as never);

    mockedUseOrders.mockReturnValue({
      data: [
        {
          id: 'o-completed',
          orderNumber: 'BK260406DONE',
          status: 'COMPLETED',
          paymentMethod: 'COD',
          payment: null,
          orderItems: [
            {
              id: 'oi-1',
              orderId: 'o-completed',
              productId: 'p1',
              name: 'Chocolate Cake',
              quantity: 1,
              price: 90000,
              subtotal: 90000,
            },
          ],
          total: 90000,
          createdAt: '2026-04-06T09:00:00.000Z',
        },
        {
          id: 'o-pending',
          orderNumber: 'BK260406PEND',
          status: 'PENDING',
          paymentMethod: 'COD',
          payment: null,
          orderItems: [
            {
              id: 'oi-2',
              orderId: 'o-pending',
              productId: 'p2',
              name: 'Seasonal Tart',
              quantity: 1,
              price: 120000,
              subtotal: 120000,
            },
          ],
          total: 120000,
          createdAt: '2026-04-05T09:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    mockedUsePrepareReorder.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as never);

    mockedUseLogout.mockReturnValue({ mutate: vi.fn() } as never);
    mockedUseUpdateProfile.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    mockedUseCart.mockReturnValue({ replaceCart } as never);
  });

  test('shows reorder button only for completed orders', () => {
    render(<ProfileScreen />);

    expect(
      screen.getByRole('button', {
        name: /Đặt lại đơn BK260406DONE/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Đặt lại đơn BK260406PEND/i,
      }),
    ).not.toBeInTheDocument();
  });

  test('prefills cart and surfaces unavailable guidance after reorder', async () => {
    mutateAsync.mockResolvedValueOnce({
      sourceOrderId: 'o-completed',
      sourceOrderNumber: 'BK260406DONE',
      items: [
        {
          productId: 'p1',
          variantId: null,
          name: 'Chocolate Cake',
          variantName: null,
          price: 90000,
          quantity: 1,
          image: '/images/chocolate.jpg',
          type: 'cake',
        },
      ],
      unavailableItems: [
        {
          productId: 'p2',
          variantId: null,
          name: 'Seasonal Tart',
          reason: 'PRODUCT_UNAVAILABLE',
          requestedQuantity: 1,
          availableQuantity: 0,
          guidance:
            'Seasonal Tart is no longer available. Please choose a similar item from the catalog.',
        },
      ],
    });

    render(<ProfileScreen />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /Đặt lại đơn BK260406DONE/i,
      }),
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ orderId: 'o-completed' });
    });

    await waitFor(() => {
      expect(replaceCart).toHaveBeenCalledWith([
        {
          id: 'p1:default',
          productId: 'p1',
          name: 'Chocolate Cake',
          price: 90000,
          image: '/images/chocolate.jpg',
          type: 'cake',
          variantId: undefined,
          variantName: undefined,
          quantity: 1,
        },
      ]);
    });

    expect(
      screen.getByText(/Đã thêm 1 món vào giỏ từ đơn #BK260406DONE\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Seasonal Tart: Seasonal Tart is no longer available\./i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Xem giỏ hàng/i })).toHaveAttribute(
      'href',
      '/cart',
    );

    const liveRegion = screen
      .getByText(/Added 1 item\(s\) to cart from order #BK260406DONE\./i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});
