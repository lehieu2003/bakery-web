'use client';

import BannerCarousel from '@/components/ui-custom/BannerCarousel';
import { useBanners } from '@/hooks/use-banners';
import HomeHeroFallback from '@/components/screens/HomeHeroFallback';
import type { Banner } from '@/types/api.types';

export default function HomeBannerSection() {
  const { data: banners, isLoading } = useBanners();
  const activeBanners = ((banners as Banner[] | undefined) ?? []).filter(
    (banner: Banner) => banner.isActive,
  );

  if (isLoading || activeBanners.length === 0) {
    return <HomeHeroFallback />;
  }

  return (
    <div data-home-intro>
      <BannerCarousel banners={activeBanners} clickable={false} />
    </div>
  );
}
