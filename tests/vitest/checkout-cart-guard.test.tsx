import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckoutCartGuard } from '@/components/screens/CheckoutCartGuard';
import { useCart, type CartItem } from '@/lib/cart-store';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(),
}));

const cake = { id: 'c1', productId: 'c1', name: 'Bánh', price: 1, quantity: 1 } as CartItem;

function mockCart(cart: CartItem[], cartReady: boolean) {
  vi.mocked(useCart).mockReturnValue({ cart, cartReady } as unknown as ReturnType<typeof useCart>);
}

function renderGuard() {
  return render(
    <CheckoutCartGuard>
      <p>Form thanh toán</p>
    </CheckoutCartGuard>,
  );
}

beforeEach(() => vi.mocked(useCart).mockReset());

describe('checkout with an empty cart', () => {
  test('waits for the saved cart before deciding', () => {
    mockCart([], false);
    renderGuard();
    expect(screen.queryByText('Form thanh toán')).toBeNull();
    expect(screen.queryByText('Giỏ hàng đang trống')).toBeNull();
  });

  test('shows the empty state instead of the form', () => {
    mockCart([], true);
    renderGuard();
    expect(screen.queryByText('Form thanh toán')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Giỏ hàng đang trống' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Xem thực đơn' }).getAttribute('href')).toBe('/');
  });

  test('shows the form when the cart has items once loaded', () => {
    mockCart([], false);
    const { rerender } = renderGuard();
    mockCart([cake], true);
    rerender(
      <CheckoutCartGuard>
        <p>Form thanh toán</p>
      </CheckoutCartGuard>,
    );
    expect(screen.getByText('Form thanh toán')).toBeTruthy();
  });

  test('keeps the page when the cart empties after arrival (order placed)', () => {
    mockCart([cake], true);
    const { rerender } = renderGuard();
    mockCart([], true);
    rerender(
      <CheckoutCartGuard>
        <p>Form thanh toán</p>
      </CheckoutCartGuard>,
    );
    expect(screen.getByText('Form thanh toán')).toBeTruthy();
    expect(screen.queryByText('Giỏ hàng đang trống')).toBeNull();
  });
});
