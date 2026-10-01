import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminCoupon } from '@/services/admin/coupons.service';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const createCoupon = vi.fn();

vi.mock('@/services/admin/coupons.service', () => ({
  couponsService: {
    getAll: vi.fn(),
    create: (...args: unknown[]) => createCoupon(...(args as [unknown])),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import AdminCouponsPage from '@/app/admin/coupons/page';
import { couponsService } from '@/services/admin/coupons.service';

const mockedGetAll = vi.mocked(couponsService.getAll);

function buildCoupon(overrides?: Partial<AdminCoupon>): AdminCoupon {
  return {
    id: 'c1',
    code: 'SAVE10',
    type: 'PERCENTAGE',
    value: '10',
    minOrder: null,
    maxDiscount: null,
    usageLimit: 100,
    perUserLimit: 1,
    startAt: '2026-10-01T00:00:00.000Z',
    endAt: '2026-10-31T23:59:59.000Z',
    isActive: true,
    _count: { redemptions: 2 },
    ...overrides,
  };
}

describe('Admin coupons page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the coupon table with usage and status', async () => {
    mockedGetAll.mockResolvedValue([buildCoupon()]);
    renderWithClient(<AdminCouponsPage />);

    expect(await screen.findByText('SAVE10')).toBeInTheDocument();
    expect(screen.getByText('2/100')).toBeInTheDocument(); // usage
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('opens the dialog and creates a coupon with a normalized code', async () => {
    mockedGetAll.mockResolvedValue([]);
    createCoupon.mockResolvedValue(buildCoupon());
    renderWithClient(<AdminCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /add coupon/i }));

    fireEvent.change(await screen.findByPlaceholderText(/SAVE10/i), {
      target: { value: '  welcome20  ' },
    });
    fireEvent.change(screen.getByLabelText(/Phần trăm giảm/i), {
      target: { value: '20' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(createCoupon).toHaveBeenCalledTimes(1);
    });
    const payload = createCoupon.mock.calls[0][0] as { code: string; value: number };
    expect(payload.code).toBe('WELCOME20'); // trimmed + uppercased
    expect(payload.value).toBe(20);
  });
});

describe('Admin coupons create dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAll.mockResolvedValue([]);
    createCoupon.mockResolvedValue(buildCoupon());
  });

  test('creates a FIXED coupon with the selected validity window', async () => {
    renderWithClient(<AdminCouponsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /add coupon/i }));

    fireEvent.change(await screen.findByPlaceholderText(/SAVE10/i), {
      target: { value: 'TET50K' },
    });
    fireEvent.change(screen.getByLabelText(/Loại giảm giá/i), {
      target: { value: 'FIXED' },
    });
    fireEvent.change(await screen.findByLabelText(/Số tiền giảm/i), {
      target: { value: '50000' },
    });
    fireEvent.change(screen.getByLabelText(/Bắt đầu/i), {
      target: { value: '2026-11-01T08:00' },
    });
    fireEvent.change(screen.getByLabelText(/Kết thúc/i), {
      target: { value: '2026-12-01T22:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(createCoupon).toHaveBeenCalledTimes(1);
    });
    const payload = createCoupon.mock.calls[0][0] as {
      code: string;
      type: string;
      value: number;
      startAt: string;
      endAt: string;
    };
    expect(payload.code).toBe('TET50K');
    expect(payload.type).toBe('FIXED');
    expect(payload.value).toBe(50000);
    expect(payload.startAt.startsWith('2026-11-01')).toBe(true);
    expect(payload.endAt.startsWith('2026-12-01')).toBe(true);
  });
});
