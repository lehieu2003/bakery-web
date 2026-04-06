import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MembershipBenefitsResponse } from '@/types/api.types';

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

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <span role='img' aria-label={alt} />,
}));

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(),
}));

vi.mock('@/hooks/use-membership-benefits', () => ({
  useMembershipBenefits: vi.fn(),
}));

import CartScreen from '@/components/screens/CartScreen';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';

const mockedUseCart = vi.mocked(useCart);
const mockedUseMembershipBenefits = vi.mocked(useMembershipBenefits);

const membershipData: MembershipBenefitsResponse = {
  user: {
    id: 'u-gold',
    memberLevel: 'GOLD',
    points: 450,
  },
  benefits: {
    tiers: [
      {
        level: 'SILVER',
        label: 'Silver',
        minPoints: 0,
        discountPercent: 3,
        isEligible: true,
      },
      {
        level: 'GOLD',
        label: 'Gold',
        minPoints: 300,
        discountPercent: 7,
        isEligible: true,
      },
      {
        level: 'PLATINUM',
        label: 'Platinum',
        minPoints: 900,
        discountPercent: 12,
        isEligible: false,
      },
    ],
    currentTier: {
      level: 'GOLD',
      label: 'Gold',
      minPoints: 300,
      discountPercent: 7,
    },
    nextTier: {
      level: 'PLATINUM',
      label: 'Platinum',
      minPoints: 900,
      pointsNeeded: 450,
    },
    eligibility: {
      isHighestTier: false,
      message: '450 more points to unlock Platinum benefits.',
    },
    pointsPerOrder: 10000,
  },
};

function buildCartValue(overrides?: Partial<ReturnType<typeof useCart>>) {
  return {
    user: {
      name: 'Gold Member',
      level: 'gold' as const,
      points: 450,
      savedThisMonth: 0,
    },
    cart: [
      {
        id: 'item-1',
        productId: 'product-1',
        name: 'Chocolate Cake',
        price: 100000,
        image: '/images/chocolate-cake.jpg',
        type: 'cake' as const,
        quantity: 2,
        pickupDate: '2026-04-10',
      },
    ],
    checkoutInfo: {
      customerName: 'Gold Member',
      customerPhone: '0909000000',
      customerEmail: 'gold@example.com',
      deliveryMethod: 'pickup' as const,
    },
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQty: vi.fn(),
    clearCart: vi.fn(),
    setCheckoutInfo: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useCart>;
}

function mockMembershipBenefits(data: MembershipBenefitsResponse | undefined) {
  mockedUseMembershipBenefits.mockReturnValue({
    data,
    isLoading: false,
  } as ReturnType<typeof useMembershipBenefits>);
}

describe('Membership benefit visibility across purchase flow', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue(buildCartValue());
    mockMembershipBenefits(membershipData);
  });

  test('shows points context and eligibility message in cart for logged-in members', () => {
    render(<CartScreen />);

    expect(screen.getByText(/Gold Member \(7%\s*off\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Current points:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/450 more points to unlock Platinum benefits\./i),
    ).toBeInTheDocument();

    const liveRegion = screen
      .getByText(/Current points:/i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  test('keeps guest state explicit in cart', () => {
    mockedUseCart.mockReturnValue(buildCartValue({ user: null }));
    mockMembershipBenefits(undefined);

    render(<CartScreen />);

    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
    expect(screen.queryByText(/Current points:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Member \(/i)).not.toBeInTheDocument();
  });

  test('shows eligibility status in checkout information sidebar', () => {
    render(<CheckoutInfoScreen />);

    expect(screen.getByText(/Current points:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/450 more points to unlock Platinum benefits\./i),
    ).toBeInTheDocument();

    const liveRegion = screen
      .getByText(/450 more points to unlock Platinum benefits\./i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  test('shows discount + live eligibility message on checkout payment', () => {
    render(<CheckoutPaymentScreen />);

    expect(screen.getByText(/Gold Member Discount Applied/i)).toBeInTheDocument();
    expect(screen.getByText(/Gold discount \(7%\)/i)).toBeInTheDocument();

    const liveMessage = screen.getByText(/Current points:/i);
    expect(liveMessage).toHaveAttribute('aria-live', 'polite');
  });
});
