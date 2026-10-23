import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

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

vi.mock('@/hooks/use-addresses', () => ({
  useAddresses: vi.fn(),
  useCreateAddress: vi.fn(),
}));

import CheckoutPaymentScreen from '@/components/screens/CheckoutPaymentScreen';
import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import { useAvailableIncentives } from '@/hooks/use-available-incentives';
import { orderService } from '@/services/order.service';
import { useOrders, usePrepareReorder } from '@/hooks/use-orders';
import { useLogout, useUpdateProfile } from '@/hooks/use-auth';
import { useAuth } from '@/providers/auth-provider';
import { useAddresses, useCreateAddress } from '@/hooks/use-addresses';
import type { Address } from '@/types/api.types';

const mockedUseCart = vi.mocked(useCart);
const mockedUseMembershipBenefits = vi.mocked(useMembershipBenefits);
const mockedUseAvailableIncentives = vi.mocked(useAvailableIncentives);
const mockedCreateOrder = vi.mocked(orderService.createOrder);
const mockedPreviewIncentive = vi.mocked(orderService.previewIncentive);
const mockedUseOrders = vi.mocked(useOrders);
const mockedUsePrepareReorder = vi.mocked(usePrepareReorder);
const mockedUseLogout = vi.mocked(useLogout);
const mockedUseUpdateProfile = vi.mocked(useUpdateProfile);
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseAddresses = vi.mocked(useAddresses);
const mockedUseCreateAddress = vi.mocked(useCreateAddress);

const savedAddress: Address = {
  id: 'a1',
  userId: 'u-1',
  fullName: 'Lan Nguyen',
  phone: '0909123456',
  street: '12 Nguyen Trai',
  ward: 'P. Ben Nghe',
  district: 'Quan 1',
  province: 'TP.HCM',
  isDefault: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const SAVED_ADDRESS_LINE = '12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM';
const EDITED_ADDRESS_LINE = '45 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM';

// Vitest config has no clearMocks; drop per-test call history so tests that
// count createOrder calls stay isolated from each other.
beforeEach(() => {
  vi.clearAllMocks();
  // The payment screen now always runs the fee-aware preview (it is the
  // authoritative price even for pickup orders), so every test needs a sane
  // default preview response; individual tests override when needed.
  mockedPreviewIncentive.mockResolvedValue({
    subtotal: 200000,
    membershipDiscount: 0,
    couponDiscount: 0,
    totalDiscount: 0,
    total: 200000,
    appliedIncentives: [],
  } as never);
});

function buildCartValue(overrides?: Partial<ReturnType<typeof useCart>>) {
  return {
    user: null,
    cart: [
      {
        id: 'p1|v1|Happy Birthday|2026-10-05',
        productId: 'p1',
        name: 'Chocolate Cake',
        price: 100000,
        image: '/images/chocolate-cake.jpg',
        type: 'cake' as const,
        variantId: 'v1',
        message: 'Happy Birthday',
        pickupDate: '2026-10-05',
        quantity: 2,
      },
    ],
    checkoutInfo: {
      customerName: 'Lan Nguyen',
      customerPhone: '0909000000',
      deliveryMethod: 'pickup' as const,
      addressId: 'a1',
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

describe('Checkout payment order payload fidelity', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue(buildCartValue());
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseAvailableIncentives.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    mockedCreateOrder.mockResolvedValue({
      order: { id: 'o-1', orderNumber: 'BK26092901' } as never,
      paymentUrl: null,
      paymentError: undefined,
      appliedIncentive: null,
    });
  });

  test('sends variant, message, pickup date, and address id with the order', async () => {
    render(<CheckoutPaymentScreen />);

    const placeOrderButton = screen.getByRole('button', { name: /^Đặt bánh/i });
    await waitFor(() => expect(placeOrderButton).toBeEnabled());
    fireEvent.click(placeOrderButton);

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledTimes(1);
    });

    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        addressId: 'a1',
        pickupDate: '2026-10-05',
        deliveryMethod: 'pickup',
        items: [
          expect.objectContaining({
            productId: 'p1',
            variantId: 'v1',
            message: 'Happy Birthday',
          }),
        ],
      }),
      // Every attempt carries an Idempotency-Key.
      { idempotencyKey: expect.any(String) },
    );
  });
});

describe('Checkout delivery fee display fidelity', () => {
  test('delivery order shows the fee-inclusive preview total and sends deliveryMethod', async () => {
    mockedUseCart.mockReturnValue(
      buildCartValue({
        checkoutInfo: {
          customerName: 'Lan Nguyen',
          customerPhone: '0909000000',
          customerAddress: '12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM',
          deliveryMethod: 'delivery' as const,
          addressId: 'a1',
        },
      }) as ReturnType<typeof useCart>,
    );
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseAvailableIncentives.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    mockedCreateOrder.mockResolvedValue({
      order: { id: 'o-1', orderNumber: 'BK26092901' } as never,
      paymentUrl: null,
      paymentError: undefined,
      appliedIncentive: null,
    });
    mockedPreviewIncentive.mockResolvedValue({
      subtotal: 200000,
      membershipDiscount: 0,
      couponDiscount: 0,
      totalDiscount: 0,
      total: 230000,
      deliveryFee: 30000,
      appliedIncentive: null,
      appliedIncentives: [],
    });

    render(<CheckoutPaymentScreen />);

    // Fee-aware preview is fetched for delivery orders so the displayed total
    // can never be lower than the charged total, and it carries the cart
    // item's variantId so the preview re-prices lines exactly like the
    // create route does.
    await waitFor(() => {
      expect(mockedPreviewIncentive).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryMethod: 'delivery',
          items: [
            expect.objectContaining({ productId: 'p1', variantId: 'v1' }),
          ],
        }),
      );
    });
    expect(screen.getByText('Phí giao hàng')).toBeInTheDocument();
    expect(screen.getByText('30.000đ')).toBeInTheDocument();
    expect(screen.getByText('230.000đ')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Đặt bánh — 230.000đ' }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /^Đặt bánh/i }));

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledTimes(1);
    });
    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryMethod: 'delivery' }),
      // Every attempt carries an Idempotency-Key.
      { idempotencyKey: expect.any(String) },
    );
  });

  test('pickup order shows a zero delivery fee row and keeps the fee-less total', async () => {
    mockedUseCart.mockReturnValue(buildCartValue() as ReturnType<typeof useCart>);
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseAvailableIncentives.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    mockedCreateOrder.mockResolvedValue({
      order: { id: 'o-1', orderNumber: 'BK26092901' } as never,
      paymentUrl: null,
      paymentError: undefined,
      appliedIncentive: null,
    });

    // The preview is authoritative for pickup orders too — the backend may
    // apply a session-based membership discount the client cannot see.
    mockedPreviewIncentive.mockResolvedValue({
      subtotal: 200000,
      membershipDiscount: 0,
      couponDiscount: 0,
      totalDiscount: 0,
      total: 200000,
      appliedIncentives: [],
    } as never);
    render(<CheckoutPaymentScreen />);

    await waitFor(() => {
      expect(mockedPreviewIncentive).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryMethod: 'pickup' }),
      );
    });
    expect(screen.getByText('Phí giao hàng')).toBeInTheDocument();
    expect(screen.getByText('0đ')).toBeInTheDocument();
    const totalBox = screen.getByText('Tổng cộng').parentElement as HTMLElement;
    expect(within(totalBox).getByText('200.000đ')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Đặt bánh — 200.000đ' }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /^Đặt bánh/i }));

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledTimes(1);
    });
    expect(orderService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ deliveryMethod: 'pickup' }),
      // Every attempt carries an Idempotency-Key.
      { idempotencyKey: expect.any(String) },
    );
  });
});

describe('Checkout saved address hand-edit fidelity', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u-1',
        email: 'lan@example.com',
        name: 'Lan Nguyen',
      },
      isAuthenticated: true,
      isLoading: false,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    mockedUseAddresses.mockReturnValue({
      data: [savedAddress],
      isLoading: false,
    } as never);
    mockedUseCreateAddress.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as never);
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseAvailableIncentives.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    } as never);
    mockedCreateOrder.mockResolvedValue({
      order: { id: 'o-1', orderNumber: 'BK26092901' } as never,
      paymentUrl: null,
      paymentError: undefined,
      appliedIncentive: null,
    });
  });

  test('drops the saved address id when the address is hand-edited after selection', async () => {
    const setCheckoutInfo = vi.fn();
    mockedUseCart.mockReturnValue(
      buildCartValue({ setCheckoutInfo }) as ReturnType<typeof useCart>,
    );

    const { unmount } = render(<CheckoutInfoScreen />);

    fireEvent.click(screen.getByRole('radio', { name: /Lan Nguyen/ }));
    const addressTextarea = screen.getByPlaceholderText(
      /Không bắt buộc khi nhận tại cửa hàng/i,
    ) as HTMLTextAreaElement;
    expect(addressTextarea.value).toBe(SAVED_ADDRESS_LINE);

    fireEvent.change(addressTextarea, {
      target: { value: EDITED_ADDRESS_LINE },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Tiếp tục thanh toán/i }),
    );

    await waitFor(() => {
      expect(setCheckoutInfo).toHaveBeenCalledTimes(1);
    });
    expect(setCheckoutInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        customerAddress: EDITED_ADDRESS_LINE,
        addressId: undefined,
      }),
    );

    const capturedInfo = setCheckoutInfo.mock.calls[0][0];
    unmount();

    mockedUseCart.mockReturnValue(
      buildCartValue({ checkoutInfo: capturedInfo }) as ReturnType<typeof useCart>,
    );
    render(<CheckoutPaymentScreen />);
    const placeOrderButton = screen.getByRole('button', { name: /^Đặt bánh/i });
    await waitFor(() => expect(placeOrderButton).toBeEnabled());
    fireEvent.click(placeOrderButton);

    await waitFor(() => {
      expect(mockedCreateOrder).toHaveBeenCalledTimes(1);
    });
    const payload = mockedCreateOrder.mock.calls[0][0];
    expect(payload.addressId).toBeUndefined();
    expect(payload.customerAddress).toBe(EDITED_ADDRESS_LINE);
    expect(payload.pickupDate).toBe('2026-10-05');
    expect(payload.items[0]).toEqual(
      expect.objectContaining({ productId: 'p1', variantId: 'v1' }),
    );
  });
});

describe('Profile order history fidelity', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u1',
        email: 'lan@example.com',
        name: 'Lan Nguyen',
        memberLevel: 'GOLD',
        points: 450,
      },
      logout: vi.fn(),
      setUser: vi.fn(),
    } as never);

    mockedUseOrders.mockReturnValue({
      data: [
        {
          id: 'o-1',
          orderNumber: 'BK26092901',
          userId: 'u1',
          customerName: 'Lan Nguyen',
          customerPhone: '0909000000',
          customerEmail: null,
          customerAddress: null,
          pickupDate: '2026-10-05',
          status: 'PENDING',
          subtotal: 200000,
          deliveryFee: 0,
          discount: 0,
          total: 200000,
          paymentMethod: 'COD',
          payment: null,
          orderItems: [
            {
              id: 'oi-1',
              orderId: 'o-1',
              productId: 'p1',
              name: 'Cake A - 500g',
              quantity: 2,
              price: 100000,
              subtotal: 200000,
              message: 'Happy Birthday',
            },
          ],
          createdAt: '2026-09-28T09:00:00.000Z',
          updatedAt: '2026-09-28T09:00:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    } as never);

    mockedUsePrepareReorder.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    mockedUseLogout.mockReturnValue({ mutate: vi.fn() } as never);
    mockedUseUpdateProfile.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
    mockedUseCart.mockReturnValue({ replaceCart: vi.fn() } as never);
  });

  test('shows order item lines, cake message, and pickup date on history cards', () => {
    render(<ProfileScreen />);

    expect(screen.getByText('Cake A - 500g × 2')).toBeInTheDocument();
    expect(screen.getByText('Happy Birthday')).toBeInTheDocument();
    expect(screen.getByText('Happy Birthday')).toHaveClass('italic');
    expect(screen.getByText(/Pickup: 2026-10-05/)).toBeInTheDocument();
  });
});
