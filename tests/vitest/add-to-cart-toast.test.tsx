import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { CartProvider, useCart, type CartItem } from '@/lib/cart-store';
import { ADDED_TO_CART_TOAST_ID } from '@/lib/cart-toast';

vi.mock('sonner', () => ({
  toast: { custom: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({ src }: { src: string }) => <span data-testid='thumb' data-src={src} />,
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

/** Adds [item] once, then renders the toast it raised next to the cart. */
function addAndShowToast(item: CartItem) {
  render(
    <CartProvider>
      <AddButton item={item} />
    </CartProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
  const [renderToast] = vi.mocked(toast.custom).mock.lastCall!;
  render(<>{(renderToast as (id: string) => React.ReactElement)('t')}</>);
}

beforeEach(() => {
  vi.mocked(toast.custom).mockClear();
  vi.mocked(toast.dismiss).mockClear();
  window.localStorage.clear();
});

describe('adding to cart confirms with a toast', () => {
  test('shows the photo and name, reusing one toast for repeated adds', () => {
    addAndShowToast(cake);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    expect(toast.custom).toHaveBeenCalledTimes(2);
    expect(vi.mocked(toast.custom).mock.lastCall![1]).toEqual({
      id: ADDED_TO_CART_TOAST_ID,
    });
    expect(screen.getByText('Đã thêm vào giỏ hàng')).toBeTruthy();
    expect(screen.getByText('Bánh kem dâu')).toBeTruthy();
    expect(screen.getByTestId('thumb').dataset.src).toBe('/cake.jpg');
  });

  test('shows the quantity when several are added at once', () => {
    addAndShowToast({ ...cake, quantity: 3 });
    expect(screen.getByText('3 × Bánh kem dâu')).toBeTruthy();
  });

  test('"Xem giỏ" opens the order summary drawer and closes the toast', () => {
    addAndShowToast(cake);
    expect(screen.getByText('drawer đóng')).toBeTruthy();

    act(() => fireEvent.click(screen.getByRole('button', { name: 'Xem giỏ' })));

    expect(screen.getByText('drawer mở')).toBeTruthy();
    expect(toast.dismiss).toHaveBeenCalledWith(ADDED_TO_CART_TOAST_ID);
  });

  test('the close button dismisses the toast', () => {
    addAndShowToast(cake);
    fireEvent.click(screen.getByRole('button', { name: 'Đóng thông báo' }));
    expect(toast.dismiss).toHaveBeenCalledWith(ADDED_TO_CART_TOAST_ID);
  });
});
