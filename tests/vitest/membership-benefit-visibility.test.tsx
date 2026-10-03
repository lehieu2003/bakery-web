import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MembershipBenefitsResponse } from '@/types/api.types';
import { ApiError } from '@/lib/api/client';
import type { AvailableIncentive } from '@/services/incentive-discovery.service';

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

vi.mock('@/hooks/use-available-incentives', () => ({
  useAvailableIncentives: vi.fn(),
}));

vi.mock('@/services/order.service', () => ({
  orderService: {
    createOrder: vi.fn(),
    previewIncentive: vi.fn(),
  },
}));

import CartScreen from '@/components/screens/CartScreen';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import { useAvailableIncentives } from '@/hooks/use-available-incentives';
import { orderService } from '@/services/order.service';

const mockedUseCart = vi.mocked(useCart);
const mockedUseMembershipBenefits = vi.mocked(useMembershipBenefits);
const mockedUseAvailableIncentives = vi.mocked(useAvailableIncentives);
const mockedCreateOrder = vi.mocked(orderService.createOrder);
const mockedPreviewIncentive = vi.mocked(orderService.previewIncentive);

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
        label: 'Bạc',
        minPoints: 0,
        discountPercent: 3,
        isEligible: true,
      },
      {
        level: 'GOLD',
        label: 'Vàng',
        minPoints: 300,
        discountPercent: 7,
        isEligible: true,
      },
      {
        level: 'PLATINUM',
        label: 'Bạch kim',
        minPoints: 900,
        discountPercent: 12,
        isEligible: false,
      },
    ],
    currentTier: {
      level: 'GOLD',
      label: 'Vàng',
      minPoints: 300,
      discountPercent: 7,
    },
    nextTier: {
      level: 'PLATINUM',
      label: 'Bạch kim',
      minPoints: 900,
      pointsNeeded: 450,
    },
    eligibility: {
      isHighestTier: false,
      message: 'Cần thêm 450 điểm để lên hạng Bạch kim.',
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
    replaceCart: vi.fn(),
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

function mockAvailableIncentives(data: AvailableIncentive[]) {
  mockedUseAvailableIncentives.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useAvailableIncentives>);
}

describe('Membership benefit visibility across purchase flow', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue(buildCartValue());
    mockMembershipBenefits(membershipData);
    mockAvailableIncentives([
      {
        code: 'WELCOME10',
        type: 'PERCENTAGE',
        value: 10,
        minOrder: 200000,
        maxDiscount: null,
        endAt: '2026-12-31T23:59:59.000Z',
      },
    ]);
    mockedPreviewIncentive.mockResolvedValue({
      subtotal: 200000,
      membershipDiscount: 14000,
      couponDiscount: 0,
      totalDiscount: 14000,
      total: 186000,
      appliedIncentives: [],
    });
    mockedCreateOrder.mockResolvedValue({
      order: { id: 'o-1', orderNumber: 'BK260406OK' } as never,
      paymentUrl: null,
      paymentError: undefined,
      appliedIncentive: null,
    });
  });

  test('shows points context and eligibility message in cart for logged-in members', () => {
    render(<CartScreen />);

    expect(screen.getByText(/Ưu đãi hạng Vàng \(giảm 7%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Điểm tích luỹ:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cần thêm 450 điểm để lên hạng Bạch kim\./i),
    ).toBeInTheDocument();

    const liveRegion = screen
      .getByText(/Điểm tích luỹ:/i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  test('keeps guest state explicit in cart', () => {
    mockedUseCart.mockReturnValue(buildCartValue({ user: null }));
    mockMembershipBenefits(undefined);

    render(<CartScreen />);

    expect(screen.getByText(/Đăng nhập/i)).toBeInTheDocument();
    expect(screen.queryByText(/Điểm tích luỹ:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Member \(/i)).not.toBeInTheDocument();
  });

  test('shows eligibility status in checkout information sidebar', () => {
    render(<CheckoutInfoScreen />);

    expect(screen.getByText(/Điểm tích luỹ:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Cần thêm 450 điểm để lên hạng Bạch kim\./i),
    ).toBeInTheDocument();

    const liveRegion = screen
      .getByText(/Cần thêm 450 điểm để lên hạng Bạch kim\./i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  test('shows discount + live eligibility message on checkout payment', () => {
    render(<CheckoutPaymentScreen />);

    expect(screen.getByText(/Ưu đãi hạng Vàng — tiết kiệm/i)).toBeInTheDocument();
    expect(screen.getByText(/Ưu đãi hạng Vàng \(7%\)/i)).toBeInTheDocument();

    const liveMessage = screen.getByText(/Điểm tích luỹ:/i);
    expect(liveMessage).toHaveAttribute('aria-live', 'polite');
  });

  test('renders available offers and apply action fills incentive input', async () => {
    render(<CheckoutPaymentScreen />);

    expect(screen.getByText(/Ưu đãi có sẵn/i)).toBeInTheDocument();
    expect(screen.getByText(/^WELCOME10$/i)).toBeInTheDocument();

    const offerRow = screen.getByText(/^WELCOME10$/i).closest('li');
    expect(offerRow).not.toBeNull();
    fireEvent.click(
      within(offerRow as HTMLElement).getByRole('button', { name: 'Áp dụng' }),
    );

    // Applying pulls the code from the offer, clears the input and surfaces
    // the applied-code chip plus the assist message.
    const incentiveInput = screen.getByPlaceholderText(
      /Nhập mã giảm giá/i,
    ) as HTMLInputElement;
    await waitFor(() => {
      expect(incentiveInput.value).toBe('');
    });
    expect(screen.getByText(/Đã áp dụng 1 mã/i)).toBeInTheDocument();
    expect(screen.getByText(/WELCOME10 ×/i)).toBeInTheDocument();
  });

  test('shows explicit empty state when there are no available offers', () => {
    mockAvailableIncentives([]);

    render(<CheckoutPaymentScreen />);

    expect(
      screen.getByText(/Chưa có ưu đãi phù hợp với giỏ hàng này/i),
    ).toBeInTheDocument();
  });

  test('shows entered incentive code in checkout summary', async () => {
    mockAvailableIncentives([]);
    render(<CheckoutPaymentScreen />);

    const incentiveInput = screen.getByPlaceholderText(
      /Nhập mã giảm giá/i,
    ) as HTMLInputElement;

    fireEvent.change(incentiveInput, { target: { value: 'spring20' } });
    expect(incentiveInput.value).toBe('SPRING20');

    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));

    await waitFor(() => {
      expect(screen.getByText(/SPRING20 ×/i)).toBeInTheDocument();
    });
  });

  test('renders actionable incentive rejection feedback in aria-live region', async () => {
    mockedCreateOrder.mockRejectedValueOnce(
      new ApiError(400, 'Bad Request', {
        success: false,
        error:
          'Incentive code "TENPERCENT" conflicts with your current membership benefit. Remove the code or increase cart value.',
      }),
    );

    // No available offers → the main 'Áp dụng' button is the only match.
    mockAvailableIncentives([]);
    render(<CheckoutPaymentScreen />);

    const incentiveInput = screen.getByPlaceholderText(
      /Nhập mã giảm giá/i,
    ) as HTMLInputElement;

    fireEvent.change(incentiveInput, { target: { value: 'tenpercent ' } });
    // Codes reach the order only through the apply step; wait for the applied
    // chip before ordering so the async apply handler has settled.
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => {
      expect(screen.getByText(/TENPERCENT ×/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^Đặt bánh/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/conflicts with your current membership benefit/i),
      ).toBeInTheDocument();
    });

    expect(mockedCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        incentiveCodes: ['TENPERCENT'],
      }),
    );

    const liveRegion = screen
      .getByText(/conflicts with your current membership benefit/i)
      .closest('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });
});

