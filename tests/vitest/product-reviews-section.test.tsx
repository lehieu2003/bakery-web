import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Review } from '@/types/api.types';

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

vi.mock('@/hooks/use-reviews', () => ({
  useProductReviews: vi.fn(),
  useSubmitReview: vi.fn(),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

import ProductReviewsSection from '@/components/web/product-reviews';
import { useProductReviews, useSubmitReview } from '@/hooks/use-reviews';
import { useAuth } from '@/providers/auth-provider';

const mockedUseProductReviews = vi.mocked(useProductReviews);
const mockedUseSubmitReview = vi.mocked(useSubmitReview);
const mockedUseAuth = vi.mocked(useAuth);

function buildReview(overrides?: Partial<Review>): Review {
  return {
    id: 'r-1',
    userId: 'u-1',
    productId: 'p1',
    rating: 5,
    comment: 'Bánh ngon lắm!',
    user: { id: 'u-1', name: 'Lan' },
    createdAt: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

function buildReviews(): Review[] {
  return [
    buildReview(),
    buildReview({
      id: 'r-2',
      userId: 'u-2',
      rating: 4,
      comment: '<script>alert(1)</script>',
      user: { id: 'u-2', name: 'Minh' },
      createdAt: '2026-08-16T00:00:00.000Z',
    }),
    buildReview({
      id: 'r-3',
      userId: 'u-3',
      rating: 4,
      comment: 'Giao hàng nhanh',
      user: { id: 'u-3', name: null },
      createdAt: '2026-08-17T00:00:00.000Z',
    }),
  ];
}

function mockAuth(isAuthenticated: boolean) {
  mockedUseAuth.mockReturnValue({
    isAuthenticated,
  } as unknown as ReturnType<typeof useAuth>);
}

function mockProductReviews(reviews: Review[]) {
  mockedUseProductReviews.mockReturnValue({
    data: {
      reviews,
      pagination: { page: 1, limit: 10, total: reviews.length },
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useProductReviews>);
}

let submitMutateAsync: ReturnType<typeof vi.fn>;

function mockSubmitReview() {
  submitMutateAsync = vi.fn().mockResolvedValue({ id: 'r-new' });
  mockedUseSubmitReview.mockReturnValue({
    mutateAsync: submitMutateAsync,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useSubmitReview>);
}

describe('ProductReviewsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(true);
    mockSubmitReview();
  });

  test('renders real stats, review list, and inert comment text', () => {
    mockProductReviews(buildReviews());
    render(<ProductReviewsSection productId='p1' reviewCount={3} ratingAverage={4} />);

    expect(screen.getAllByText('★').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(3 reviews)')).toBeInTheDocument();
    expect(screen.getByText(/ngon/)).toBeInTheDocument();
    // XSS pin: script markup must be inert text, not injected
    expect(screen.getByText('<script>alert(1)</script>').tagName).toBe('P');
  });

  test('omits the stats row when the product has no reviews', () => {
    mockProductReviews([]);
    render(<ProductReviewsSection productId='p1' reviewCount={0} ratingAverage={null} />);

    expect(screen.queryByText(/reviews/)).not.toBeInTheDocument();
  });

  test('submits the selected rating and comment for authenticated users', () => {
    mockProductReviews(buildReviews());
    render(<ProductReviewsSection productId='p1' reviewCount={3} ratingAverage={4} />);

    fireEvent.click(screen.getByRole('button', { name: '4 sao' }));

    const textarea = screen.getByPlaceholderText(/chia sẻ cảm nhận/i);
    fireEvent.change(textarea, { target: { value: 'test' } });

    fireEvent.click(screen.getByRole('button', { name: /gửi đánh giá/i }));

    expect(submitMutateAsync).toHaveBeenCalledWith({ rating: 4, comment: 'test' });
  });

  test('shows a login link for guests instead of the submit form', () => {
    mockAuth(false);
    mockProductReviews(buildReviews());
    render(<ProductReviewsSection productId='p1' reviewCount={3} ratingAverage={4} />);

    const loginLink = screen.getByText('Đăng nhập để đánh giá');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute(
      'href',
      '/auth?redirect=/products/p1',
    );
    expect(screen.queryByRole('button', { name: /gửi đánh giá/i })).not.toBeInTheDocument();
  });

  test('renders the Khách name fallback and vi-VN review date', () => {
    mockProductReviews(buildReviews());
    render(<ProductReviewsSection productId='p1' reviewCount={3} ratingAverage={4} />);

    expect(screen.getByText('Khách')).toBeInTheDocument();
    expect(screen.getByText('15/8/2026')).toBeInTheDocument();
  });
});
