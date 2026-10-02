/**
 * Reusable Layered Hero Banner Carousel Component
 * Multi-layer decoupled animation: Background Morph + Media Scale/Crossfade + Decoration Stagger + Stable Content
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import type { Banner } from '@/types/api.types';

interface BannerCarouselProps {
  banners: Banner[];
  clickable?: boolean;
  autoPlayInterval?: number;
}

// Preset visual palettes tailored for bakery aesthetics
const THEMES = [
  {
    bgGradient: 'from-[#2b1810] via-[#3a2015] to-[#180e09]',
    ambientGlow: 'rgba(224, 169, 109, 0.18)',
    accentColor: '#e0a96d',
    badgeText: 'Freshly Baked Daily',
    tagline: 'Artisanal Bakery & Patisserie',
  },
  {
    bgGradient: 'from-[#192622] via-[#22332e] to-[#101917]',
    ambientGlow: 'rgba(149, 213, 178, 0.16)',
    accentColor: '#95d5b2',
    badgeText: 'Pure Japanese Matcha',
    tagline: 'Ceremonial Grade Flavour',
  },
  {
    bgGradient: 'from-[#2a1420] via-[#3b1c2e] to-[#190c13]',
    ambientGlow: 'rgba(244, 166, 205, 0.16)',
    accentColor: '#f4a6cd',
    badgeText: 'Berry & Rose Cream',
    tagline: 'Seasonal French Patisserie',
  },
  {
    bgGradient: 'from-[#271d11] via-[#382b1a] to-[#171109]',
    ambientGlow: 'rgba(243, 198, 143, 0.18)',
    accentColor: '#f3c68f',
    badgeText: '100% French Butter',
    tagline: 'Golden Flaky Perfection',
  },
];

const ANIMATION_DURATION = 500; // ms

export default function BannerCarousel({
  banners,
  clickable = true,
  autoPlayInterval = 4800,
}: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const total = banners.length;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (isAnimating || total <= 1) return;
      setIsAnimating(true);
      setCurrentIndex((nextIndex + total) % total);

      setTimeout(() => {
        setIsAnimating(false);
      }, ANIMATION_DURATION);
    },
    [isAnimating, total],
  );

  const handlePrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  // Autoplay with pause on hover
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [autoPlayInterval, currentIndex, goToSlide, isPaused, total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') handlePrev();
      if (event.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  if (!banners || banners.length === 0) {
    return null;
  }

  const currentTheme = THEMES[currentIndex % THEMES.length];
  const currentBanner = banners[currentIndex];

  return (
    <section
      className='relative w-full overflow-hidden select-none'
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription='carousel'
      aria-label='Hero Banners'
    >
      {/* 1. BACKGROUND LAYER: Smooth gradient crossfade + ambient radial aura */}
      <div className='absolute inset-0 z-0 overflow-hidden'>
        {banners.map((_, index) => {
          const theme = THEMES[index % THEMES.length];
          const isActive = index === currentIndex;
          return (
            <div
              key={index}
              className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient} transition-opacity duration-500 ease-in-out`}
              style={{
                opacity: isActive ? 1 : 0,
                zIndex: isActive ? 1 : 0,
              }}
            >
              {/* Ambient radial lighting behind media focal point */}
              <div
                className='absolute right-0 top-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-3xl pointer-events-none opacity-40 transition-transform duration-700'
                style={{
                  background: `radial-gradient(circle, ${theme.ambientGlow} 0%, transparent 70%)`,
                  transform: isActive ? 'scale(1)' : 'scale(0.8)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Hero container layout */}
      <div className='relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16 lg:py-20 min-h-[480px] md:min-h-[560px] lg:min-h-[600px] flex items-center'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full'>
          {/* 2. CONTENT & DECORATION LAYERS (Left Column) */}
          <div className='lg:col-span-7 flex flex-col justify-center space-y-6 pr-16 lg:pr-0'>
            {/* Decoration Layer: Pill badge */}
            <div
              className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-md w-fit text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-350 ease-out'
              style={{
                opacity: isAnimating ? 0.6 : 1,
                transform: isAnimating ? 'translateY(8px)' : 'translateY(0)',
              }}
            >
              <Sparkles
                size={14}
                style={{ color: currentTheme.accentColor }}
                className='animate-pulse'
              />
              <span>{currentTheme.badgeText}</span>
            </div>

            {/* Content Layer: Heading & Description */}
            <div className='space-y-4 max-w-2xl'>
              <p
                className='text-xs md:text-sm font-semibold tracking-widest uppercase text-white/70 transition-opacity duration-300'
                style={{ color: currentTheme.accentColor }}
              >
                {currentTheme.tagline}
              </p>
              <h1
                key={`title-${currentIndex}`}
                className='font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.15] tracking-tight transition-opacity duration-300 ease-out'
              >
                {currentBanner.title}
              </h1>
              {currentBanner.description && (
                <p
                  key={`desc-${currentIndex}`}
                  className='text-white/80 text-sm md:text-base lg:text-lg font-sans leading-relaxed line-clamp-3 transition-opacity duration-300 ease-out'
                >
                  {currentBanner.description}
                </p>
              )}
            </div>

            {/* Call to Action Buttons */}
            <div className='flex flex-wrap items-center gap-4 pt-2'>
              {clickable && currentBanner.linkUrl ? (
                <Link
                  href={currentBanner.linkUrl}
                  className='inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm text-foreground bg-white hover:bg-white/90 shadow-lg shadow-black/15 transition-all hover:gap-3 active:scale-95'
                >
                  <span>Khám phá ngay</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  href='/search'
                  className='inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-medium text-sm text-foreground bg-white hover:bg-white/90 shadow-lg shadow-black/15 transition-all hover:gap-3 active:scale-95'
                >
                  <span>Xem thực đơn bánh</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              <Link
                href='/search'
                className='inline-flex items-center px-5 py-3.5 rounded-full text-sm font-medium text-white/90 hover:text-white border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all active:scale-95'
              >
                Tất cả sản phẩm
              </Link>
            </div>
          </div>

          {/* 3. MEDIA LAYER (Right Column): Crossfade + Scale (1.05 -> 1.0) */}
          <div className='lg:col-span-5 relative flex items-center justify-center'>
            <div className='relative w-full max-w-[420px] aspect-[4/3] sm:aspect-square lg:aspect-[4/4.2]'>
              {banners.map((banner, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={banner.id}
                    className='absolute inset-0 transition-all duration-500 ease-out pointer-events-none'
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive
                        ? 'scale(1) translateZ(0)'
                        : 'scale(1.05) translateZ(0)',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                      zIndex: isActive ? 2 : 1,
                    }}
                  >
                    <div className='relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl shadow-black/30'>
                      <Image
                        src={banner.imageUrl ?? ''}
                        alt={banner.title}
                        fill
                        className='object-cover'
                        priority={index === 0}
                        sizes='(max-width: 1024px) 100vw, 500px'
                      />
                      {/* Subtle glossy overlay */}
                      <div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/10 pointer-events-none' />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. NAVIGATION & CONTROLS: Arrow buttons + Indicators */}
      {total > 1 && (
        <>
          {/* Arrow Buttons (Bottom Right / Desktop Overlay) */}
          <div className='absolute bottom-6 right-6 md:right-10 z-20 flex items-center gap-2.5'>
            <button
              onClick={handlePrev}
              disabled={isAnimating}
              aria-label='Previous slide'
              className='p-3 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/30 cursor-pointer'
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              disabled={isAnimating}
              aria-label='Next slide'
              className='p-3 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white border border-white/15 backdrop-blur-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:border-white/30 cursor-pointer'
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dots / Pill Indicators (Bottom Center/Left) */}
          <div className='absolute bottom-6 left-6 md:left-10 z-20 flex items-center gap-2'>
            {banners.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  disabled={isAnimating}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'w-7 bg-white shadow-sm'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
