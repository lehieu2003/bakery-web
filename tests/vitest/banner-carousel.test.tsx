import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Banner } from '@/types/api.types';

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

import BannerCarousel from '@/components/ui-custom/BannerCarousel';

const banners = ['Tiramisu', 'Bộ sưu tập Xuân', 'Bánh cưới'].map(
  (title, index) =>
    ({
      id: `b${index}`,
      title,
      description: null,
      imageUrl: `/banner-${index}.jpg`,
      linkUrl: null,
    }) as unknown as Banner,
);

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

const heading = () => screen.getByRole('heading', { level: 1 }).textContent;

describe('BannerCarousel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test('arrow keys typed outside the hero do not change the slide', () => {
    render(
      <>
        <input aria-label='Tìm kiếm' />
        <BannerCarousel banners={banners} />
      </>,
    );

    fireEvent.keyDown(screen.getByLabelText('Tìm kiếm'), { key: 'ArrowRight' });

    expect(heading()).toBe('Tiramisu');
  });

  test('arrow keys move the slide while focus is inside the hero', () => {
    render(<BannerCarousel banners={banners} />);

    fireEvent.keyDown(screen.getByLabelText('Ảnh sau'), { key: 'ArrowRight' });

    expect(heading()).toBe('Bộ sưu tập Xuân');
  });

  test('autoplay rotates, and the pause button stops it', () => {
    render(<BannerCarousel banners={banners} autoPlayInterval={1000} />);

    act(() => vi.advanceTimersByTime(1000));
    expect(heading()).toBe('Bộ sưu tập Xuân');

    fireEvent.click(screen.getByLabelText('Dừng tự chuyển ảnh'));
    act(() => vi.advanceTimersByTime(5000));

    expect(heading()).toBe('Bộ sưu tập Xuân');
    expect(screen.getByLabelText('Tự chuyển ảnh')).toBeInTheDocument();
  });

  test('choosing a slide stops autoplay', () => {
    render(<BannerCarousel banners={banners} autoPlayInterval={1000} />);

    fireEvent.click(screen.getByLabelText('Ảnh banner 3'));
    act(() => vi.advanceTimersByTime(5000));

    expect(heading()).toBe('Bánh cưới');
  });

  test('reduced-motion visitors start paused', () => {
    stubReducedMotion(true);
    render(<BannerCarousel banners={banners} autoPlayInterval={1000} />);

    act(() => vi.advanceTimersByTime(5000));

    expect(heading()).toBe('Tiramisu');
    expect(screen.getByLabelText('Tự chuyển ảnh')).toBeInTheDocument();
  });
});
