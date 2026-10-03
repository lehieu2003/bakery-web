import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role='img' aria-label={alt} />,
}));

const cartState = {
  user: null as null | { name: string; points: number; level: string },
  cart: [
    {
      id: 'p1',
      productId: 'p1',
      name: 'Cake',
      price: 50000,
      quantity: 1,
      image: '',
      type: 'cake' as const,
    },
  ],
  checkoutInfo: { method: 'delivery', deliveryMethod: 'delivery' } as Record<
    string,
    unknown
  >,
  clearCart: vi.fn(),
};

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(() => cartState),
}));

vi.mock('@/hooks/use-membership-benefits', () => ({
  useMembershipBenefits: vi.fn(() => ({
    data: {
      benefits: {
        currentTier: { discountPercent: 7, label: 'Gold' },
        eligibility: { message: 'ok' },
      },
      user: { points: 420 },
    },
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-available-incentives', () => ({
  useAvailableIncentives: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/services/order.service', () => ({
  orderService: {
    previewIncentive: vi.fn(async () => ({
      total: 50000,
      couponDiscount: 0,
      deliveryFee: 30000,
    })),
    createOrder: vi.fn(),
  },
}));

import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';

describe('COD payment label follows the fulfillment method', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cartState.checkoutInfo = { method: 'delivery', deliveryMethod: 'delivery' };
  });

  test('delivery order shows the COD-delivery wording, not the pickup wording', () => {
    const { getByText, queryByText } = render(<CheckoutPaymentScreen />);
    expect(getByText('Tiền mặt khi giao')).toBeInTheDocument();
    expect(queryByText('Tiền mặt tại cửa hàng')).toBeNull();
  });

  test('pickup order shows the COD-pickup wording', () => {
    cartState.checkoutInfo = { method: 'pickup', deliveryMethod: 'pickup' };
    const { getByText, queryByText } = render(<CheckoutPaymentScreen />);
    expect(getByText('Tiền mặt tại cửa hàng')).toBeInTheDocument();
    expect(queryByText('Tiền mặt khi giao')).toBeNull();
  });
});
