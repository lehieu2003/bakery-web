import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { CartProvider, useCart, type CartItem } from '@/lib/cart-store';
import { ADDED_TO_CART_TOAST_ID } from '@/lib/cart-toast';

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

const cake: CartItem = {
  id: 'prod-42',
  productId: 'prod-42',
  name: 'Bánh kem dâu',
  price: 250000,
  image: '/cake.jpg',
  type: 'cake',
  quantity: 1,
};

function AddButton({ item }: { item: CartItem }) {
  const { addToCart, orderSummaryOpen } = useCart();
  return (
    <>
      <button onClick={() => addToCart(item)}>Thêm</button>
      <output>{orderSummaryOpen ? 'drawer mở' : 'drawer đóng'}</output>
    </>
  );
}

function renderCart(item: CartItem) {
  render(
    <CartProvider>
      <AddButton item={item} />
    </CartProvider>,
  );
}

type ToastOptions = {
  id: string;
  description: string;
  action: { label: string; onClick: () => void };
};

function lastToast() {
  const call = vi.mocked(toast.success).mock.lastCall!;
  return { title: call[0], options: call[1] as unknown as ToastOptions };
}

beforeEach(() => {
  vi.mocked(toast.success).mockClear();
  window.localStorage.clear();
});

describe('adding to cart confirms with a toast', () => {
  test('names the product and reuses one toast for repeated adds', () => {
    renderCart(cake);

    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    expect(toast.success).toHaveBeenCalledTimes(2);
    const { title, options } = lastToast();
    expect(title).toBe('Đã thêm vào giỏ hàng');
    expect(options.description).toBe('Bánh kem dâu');
    expect(options.id).toBe(ADDED_TO_CART_TOAST_ID);
  });

  test('shows the quantity when several are added at once', () => {
    renderCart({ ...cake, quantity: 3 });

    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    expect(lastToast().options.description).toBe('3 × Bánh kem dâu');
  });

  test('"Xem giỏ hàng" opens the order summary drawer', () => {
    renderCart(cake);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('drawer đóng')).toBeTruthy();

    const { action } = lastToast().options;
    expect(action.label).toBe('Xem giỏ hàng');
    act(() => action.onClick());

    expect(screen.getByText('drawer mở')).toBeTruthy();
  });
});
