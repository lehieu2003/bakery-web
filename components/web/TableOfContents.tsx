'use client';

import { useEffect, useRef, useState } from 'react';
import { List } from 'lucide-react';

interface Heading {
  id: string;
  text: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

interface TableOfContentsProps {
  contentSelector?: string;
}

export default function TableOfContents({
  contentSelector = '.prose',
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Extract h2 headings from the rendered prose and assign IDs
  useEffect(() => {
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const h2Elements = Array.from(container.querySelectorAll('h2'));
    const extracted: Heading[] = h2Elements.map((el, index) => {
      const text = el.textContent ?? '';
      const id = el.id || `toc-${slugify(text)}-${index}`;
      el.id = id;
      return { id, text };
    });

    setHeadings(extracted);
  }, [contentSelector]);

  // Observe headings for active highlight
  useEffect(() => {
    if (headings.length === 0) return;

    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  if (headings.length === 0) return null;

  return (
    <div className='bg-card rounded-2xl border border-border p-5'>
      <h3 className='font-serif text-sm font-semibold text-foreground mb-4 uppercase tracking-widest flex items-center gap-2'>
        <List size={14} />
        Nội dung bài viết
      </h3>
      <nav aria-label='Table of contents'>
        <ul className='space-y-1'>
          {headings.map(({ id, text }) => {
            const isActive = activeId === id;
            return (
              <li key={id}>
                <button
                  onClick={() => handleClick(id)}
                  className={`w-full text-left text-sm leading-snug py-1.5 px-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary font-medium bg-primary/8'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {text}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
