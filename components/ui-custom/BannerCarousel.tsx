/**
 * Banner Carousel Component
 * Horizontal scrollable banner slider using Embla Carousel
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/types/api.types';
import Autoplay from 'embla-carousel-autoplay';

interface BannerCarouselProps {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: BannerCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <section className='relative w-full'>
      <div className='overflow-hidden' ref={emblaRef}>
        <div className='flex'>
          {banners.map((banner) => (
            <div
              key={banner.id}
              className='flex-[0_0_100%] min-w-0 relative h-[400px] md:h-[500px] lg:h-[600px]'
            >
              {banner.linkUrl ? (
                <Link href={banner.linkUrl} className='block w-full h-full'>
                  <BannerContent banner={banner} />
                </Link>
              ) : (
                <BannerContent banner={banner} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className='absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all z-10 backdrop-blur-sm'
            aria-label='Previous banner'
          >
            <ChevronLeft size={20} className='text-foreground' />
          </button>
          <button
            onClick={scrollNext}
            className='absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-all z-10 backdrop-blur-sm'
            aria-label='Next banner'
          >
            <ChevronRight size={20} className='text-foreground' />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className='absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10'>
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-white w-6'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BannerContent({ banner }: { banner: Banner }) {
  return (
    <div className='relative w-full h-full'>
      <Image
        src={banner.imageUrl}
        alt={banner.title}
        fill
        className='object-cover'
        priority
      />
      {(banner.title || banner.description) && (
        <div className='absolute inset-0 bg-gradient-to-r from-foreground/65 via-foreground/30 to-transparent'>
          <div className='absolute inset-0 flex items-center'>
            <div className='max-w-7xl mx-auto px-6 lg:px-8 w-full'>
              <div className='max-w-xl'>
                {banner.title && (
                  <h2 className='font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-4'>
                    {banner.title}
                  </h2>
                )}
                {banner.description && (
                  <p className='text-white/80 text-base md:text-lg font-sans leading-relaxed'>
                    {banner.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
