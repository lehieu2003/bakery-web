'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';

type HomeMotionProps = {
  children: ReactNode;
};

export default function HomeMotion({ children }: HomeMotionProps) {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

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

          animate(entry.target, {
            opacity: [0, 1],
            y: [28, 0],
            duration: 850,
            ease: 'out(4)',
          });

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

    scope.current = createScope({ root }).add(() => {
      animate('[data-home-intro]', {
        opacity: [0, 1],
        y: [22, 0],
        duration: 900,
        delay: stagger(95, { start: 160 }),
        ease: 'out(4)',
      });

      animate('[data-home-card]', {
        opacity: [0, 1],
        y: [18, 0],
        duration: 650,
        delay: stagger(55, { start: 220 }),
        ease: 'out(3)',
      });

      animate('[data-home-float]', {
        y: [
          { to: -10, duration: 1800, ease: 'inOut(2)' },
          { to: 0, duration: 1800, ease: 'inOut(2)' },
        ],
        rotate: [
          { to: -1.5, duration: 1800, ease: 'inOut(2)' },
          { to: 0.8, duration: 1800, ease: 'inOut(2)' },
        ],
        loop: true,
      });
    });

    return () => {
      revealObserver.disconnect();
      storyObserver.disconnect();
      scope.current?.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
