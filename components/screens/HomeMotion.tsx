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
      scope.current?.revert();
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
