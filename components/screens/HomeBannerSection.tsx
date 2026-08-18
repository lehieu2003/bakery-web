'use client';

import BannerCarousel from '@/components/ui-custom/BannerCarousel';
import { useBanners } from '@/hooks/use-banners';
import type { Banner } from '@/types/api.types';

export default function HomeBannerSection() {
  const { data: banners } = useBanners();
  const activeBanners = ((banners as Banner[] | undefined) ?? []).filter(
    (banner: Banner) => banner.isActive,
  );

  return (
    <div data-home-intro>
      <BannerCarousel banners={activeBanners} clickable={false} />
    </div>
  );
}
