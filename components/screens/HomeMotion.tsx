'use client';

import { type ReactNode, useEffect, useRef } from 'react';

type HomeMotionProps = {
  children: ReactNode;
};

export default function HomeMotion({ children }: HomeMotionProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootElement = root.current;
    if (!rootElement) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReducedMotion) return;

    const revealElements = Array.from(
      rootElement.querySelectorAll<HTMLElement>('[data-home-reveal]'),
    );
    const storySections = Array.from(
      rootElement.querySelectorAll<HTMLElement>('[data-scroll-story]'),
    );

    revealElements.forEach((element) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(28px)';
    });

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('home-motion-visible');

          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      },
    );

    revealElements.forEach((element) => revealObserver.observe(element));

    const storyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const step = entry.target as HTMLElement;
          const story = step.closest<HTMLElement>('[data-scroll-story]');
          const index = step.dataset.storyStep;
          if (!story || !index) return;

          story
            .querySelectorAll<HTMLElement>('[data-story-step]')
            .forEach((item) => {
              item.dataset.active = item === step ? 'true' : 'false';
            });

          story
            .querySelectorAll<HTMLElement>('[data-story-visual]')
            .forEach((item) => {
              item.dataset.active =
                item.dataset.storyVisual === index ? 'true' : 'false';
            });
        });
      },
      {
        rootMargin: '-42% 0px -42% 0px',
        threshold: 0,
      },
    );

    storySections.forEach((story) => {
      const firstStep = story.querySelector<HTMLElement>('[data-story-step]');
      const firstVisual = story.querySelector<HTMLElement>(
        '[data-story-visual]',
      );
      if (firstStep) firstStep.dataset.active = 'true';
      if (firstVisual) firstVisual.dataset.active = 'true';

      story
        .querySelectorAll<HTMLElement>('[data-story-step]')
        .forEach((step) => storyObserver.observe(step));
    });

    rootElement
      .querySelectorAll<HTMLElement>('[data-home-intro], [data-home-card]')
      .forEach((element, index) => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        element.style.transition =
          'opacity 650ms ease, transform 650ms ease';
        element.style.transitionDelay = `${Math.min(index * 45, 220)}ms`;
      });

    rootElement
      .querySelectorAll<HTMLElement>('[data-home-float]')
      .forEach((element) => {
        element.style.animation = 'homeFloat 3.6s ease-in-out infinite';
      });

    return () => {
      revealObserver.disconnect();
      storyObserver.disconnect();
    };
  }, []);

  return (
    <div ref={root}>
      <style jsx global>{`
        .home-motion-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
          transition:
            opacity 850ms ease,
            transform 850ms ease;
        }

        @keyframes homeFloat {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(-1deg);
          }
        }
      `}</style>
      {children}
    </div>
  );
}
