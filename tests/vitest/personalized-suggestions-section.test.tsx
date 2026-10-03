import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Product } from '@/types/api.types';

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

vi.mock('@/hooks/use-personalized-recommendations', () => ({
  usePersonalizedRecommendations: vi.fn(),
}));

vi.mock('@/lib/cart-store', () => ({
  useCart: vi.fn(),
}));

import PersonalizedSuggestionsSection from '@/components/screens/PersonalizedSuggestionsSection';
import { usePersonalizedRecommendations } from '@/hooks/use-personalized-recommendations';
import { useCart } from '@/lib/cart-store';

const mockedUsePersonalizedRecommendations = vi.mocked(usePersonalizedRecommendations);
const mockedUseCart = vi.mocked(useCart);

function buildProduct(overrides?: Partial<Product>): Product {
  return {
    id: 'p-1',
    name: 'Chocolate Cake',
    slug: 'chocolate-cake',
    description: 'Rich and moist',
    shortDescription: 'Rich and moist',
    price: 125000,
    comparePrice: null,
    costPrice: null,
    sku: null,
    barcode: null,
    stock: 10,
    trackStock: true,
    weight: null,
    images: [],
    categories: [],
    variants: [],
    attributeAssignments: [],
    isActive: true,
    isFeatured: true,
    createdAt: '2026-04-06T00:00:00.000Z',
    updatedAt: '2026-04-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('PersonalizedSuggestionsSection', () => {
  beforeEach(() => {
    mockedUseCart.mockReturnValue({
      addToCart: vi.fn(),
    } as unknown as ReturnType<typeof useCart>);

    mockedUsePersonalizedRecommendations.mockReturnValue({
      data: {
        products: [buildProduct()],
        source: 'behavioral',
        reason: 'behavior-match',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersonalizedRecommendations>);
  });

  test('renders personalized section with behavioral products', () => {
    render(<PersonalizedSuggestionsSection />);

    expect(screen.getByText(/Gợi Ý Dành Cho Bạn/i)).toBeInTheDocument();
    expect(screen.getByText(/Chocolate Cake/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Sign in to unlock personalized suggestions/i),
    ).not.toBeInTheDocument();
  });

  test('hides section for anonymous visitors to avoid duplicating best sellers', () => {
    mockedUsePersonalizedRecommendations.mockReturnValue({
      data: {
        products: [buildProduct()],
        source: 'fallback',
        reason: 'no-user',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersonalizedRecommendations>);

    const { container } = render(<PersonalizedSuggestionsSection />);

    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByText(/Gợi Ý Dành Cho Bạn/i),
    ).not.toBeInTheDocument();
  });

  test('returns null when there are no products and loading has finished', () => {
    mockedUsePersonalizedRecommendations.mockReturnValue({
      data: {
        products: [],
        source: 'fallback',
        reason: 'no-signal',
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof usePersonalizedRecommendations>);

    const { container } = render(<PersonalizedSuggestionsSection />);

    expect(container.firstChild).toBeNull();
  });

  test('shows error fallback message when query fails and no products are available', () => {
    mockedUsePersonalizedRecommendations.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof usePersonalizedRecommendations>);

    render(<PersonalizedSuggestionsSection />);

    expect(
      screen.getByText(/Chưa tải được gợi ý dành cho bạn/i),
    ).toBeInTheDocument();
  });
});
