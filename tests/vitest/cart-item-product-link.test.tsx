import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import CartScreen from '@/components/screens/CartScreen';
import { FloatingOrderSummary } from '@/components/screens/FloatingOrderSummary';
import { useCart, type CartItem } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
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

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role='img' aria-label={alt} />,
}));

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(),
}));

vi.mock('@/hooks/use-membership-benefits', () => ({
  useMembershipBenefits: vi.fn(),
}));

const item: CartItem = {
  id: 'line-1',
  productId: 'prod-42',
  name: 'Bánh kem dâu',
  price: 250000,
  image: '/cake.jpg',
  type: 'cake',
  quantity: 2,
};

beforeEach(() => {
  vi.mocked(useCart).mockReturnValue({
    cart: [item],
    user: null,
    removeFromCart: vi.fn(),
    updateQty: vi.fn(),
    clearCart: vi.fn(),
    orderSummaryOpen: true,
    setOrderSummaryOpen: vi.fn(),
  } as unknown as ReturnType<typeof useCart>);
  vi.mocked(useMembershipBenefits).mockReturnValue({
    data: undefined,
    isLoading: false,
  } as unknown as ReturnType<typeof useMembershipBenefits>);
});

function expectLinksToProduct(scope: HTMLElement) {
  // The name is the one focusable link; the image repeats it for the mouse
  // and touch only, so keyboard users do not land on the same link twice.
  const nameLink = within(scope).getByRole('link', { name: item.name });
  expect(nameLink.getAttribute('href')).toBe('/products/prod-42');

  const imageLink = scope.querySelector(
    'a[aria-hidden="true"][href="/products/prod-42"]',
  );
  expect(imageLink).not.toBeNull();
  expect(imageLink?.getAttribute('tabindex')).toBe('-1');
}

describe('cart items open their product page', () => {
  test('on the cart page', () => {
    const { container } = render(<CartScreen />);
    expectLinksToProduct(container);
    // The quantity and remove buttons stay buttons, outside the links.
    expect(screen.getByRole('button', { name: 'Tăng số lượng' }).closest('a')).toBeNull();
    expect(screen.getByRole('button', { name: 'Xóa sản phẩm' }).closest('a')).toBeNull();
  });

  test('in the order summary drawer', () => {
    const { container } = render(<FloatingOrderSummary />);
    expectLinksToProduct(container);
    expect(
      screen.getByRole('button', { name: `Xóa món ${item.name}` }).closest('a'),
    ).toBeNull();
  });
});
