import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Address } from '@/types/api.types';

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

vi.mock('@/hooks/use-addresses', () => ({
  useAddresses: vi.fn(),
  useCreateAddress: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import CheckoutInfoScreen from '@/components/screens/CheckoutInfoScreen';
import { useAddresses, useCreateAddress } from '@/hooks/use-addresses';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';

const mockedUseAddresses = vi.mocked(useAddresses);
const mockedUseCreateAddress = vi.mocked(useCreateAddress);
const mockedUseAuth = vi.mocked(useAuth);
const mockedUseCart = vi.mocked(useCart);
const mockedUseMembershipBenefits = vi.mocked(useMembershipBenefits);

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

function buildCartValue() {
  return {
    user: null,
    cart: [],
    cartReady: true,
    checkoutInfo: null,
    addToCart: vi.fn(),
    replaceCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateQty: vi.fn(),
    clearCart: vi.fn(),
    setCheckoutInfo: vi.fn(),
    orderSummaryOpen: false,
    setOrderSummaryOpen: vi.fn(),
  } as ReturnType<typeof useCart>;
}

function mockAuthenticatedUser() {
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
}

describe('Checkout saved address picker', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue(buildCartValue());
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseCreateAddress.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as never);
  });

  test('renders saved address as a selectable card and fills contact fields on click', () => {
    mockAuthenticatedUser();
    mockedUseAddresses.mockReturnValue({
      data: [savedAddress],
      isLoading: false,
    } as never);

    render(<CheckoutInfoScreen />);

    const card = screen.getByRole('radio', { name: /Lan Nguyen/ });
    expect(card).toBeInTheDocument();
    expect(screen.getByText('0909123456')).toBeInTheDocument();
    expect(screen.getByText('Mặc định')).toBeInTheDocument();

    fireEvent.click(card);

    expect(
      screen.getByPlaceholderText(/Không bắt buộc khi nhận tại cửa hàng/i),
    ).toHaveValue('12 Nguyen Trai, P. Ben Nghe, Quan 1, TP.HCM');
    expect(screen.getByPlaceholderText('Họ và tên của bạn')).toHaveValue(
      'Lan Nguyen',
    );
    expect(screen.getByPlaceholderText(/0909 xxx xxx/)).toHaveValue(
      '0909123456',
    );
  });

  test('keeps the free-text textarea as the only address UI for guests', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    mockedUseAddresses.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    render(<CheckoutInfoScreen />);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByText(/Lan Nguyen/)).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Không bắt buộc khi nhận tại cửa hàng/i),
    ).toBeInTheDocument();
  });
});

describe('Checkout contact prefill when auth resolves after mount', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue(buildCartValue());
    mockedUseMembershipBenefits.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as never);
    mockedUseCreateAddress.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    } as never);
    mockedUseAddresses.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
  });

  test('prefills name and phone from the profile when user arrives after mount', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    const { rerender } = render(<CheckoutInfoScreen />);
    expect(screen.getByPlaceholderText('Họ và tên của bạn')).toHaveValue('');

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u-1',
        email: 'lan@example.com',
        name: 'Lan Nguyen',
        phone: '0901234567',
      },
      isAuthenticated: true,
      isLoading: false,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    rerender(<CheckoutInfoScreen />);

    expect(screen.getByPlaceholderText('Họ và tên của bạn')).toHaveValue(
      'Lan Nguyen',
    );
    expect(screen.getByPlaceholderText(/0909 xxx xxx/)).toHaveValue(
      '0901234567',
    );
  });

  test('does not overwrite a name the user already typed', () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    const { rerender } = render(<CheckoutInfoScreen />);
    fireEvent.change(screen.getByPlaceholderText('Họ và tên của bạn'), {
      target: { value: 'Typed First' },
    });

    mockedUseAuth.mockReturnValue({
      user: {
        id: 'u-1',
        email: 'lan@example.com',
        name: 'Lan Nguyen',
        phone: '0901234567',
      },
      isAuthenticated: true,
      isLoading: false,
      setUser: vi.fn(),
      logout: vi.fn(),
    } as never);
    rerender(<CheckoutInfoScreen />);

    expect(screen.getByPlaceholderText('Họ và tên của bạn')).toHaveValue(
      'Typed First',
    );
  });
});
