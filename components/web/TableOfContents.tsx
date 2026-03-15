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
  /** Raw HTML content of the blog post */
  content: string;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Parse headings from raw HTML string — no DOM timing issues
  useEffect(() => {
    if (!content) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const h2Elements = Array.from(doc.querySelectorAll('h2'));

    const extracted: Heading[] = h2Elements.map((el, index) => {
      const text = el.textContent?.trim() ?? '';
      const id = el.id || `toc-${slugify(text)}-${index}`;
      return { id, text };
    });

    const timer = setTimeout(() => setHeadings(extracted), 0);
    return () => clearTimeout(timer);
  }, [content]);

  // After headings are known, assign IDs to real DOM nodes
  useEffect(() => {
    if (headings.length === 0) return;

    // Wait a tick for dangerouslySetInnerHTML to finish rendering
    const timer = setTimeout(() => {
      const container = document.querySelector('.blog-content');
      if (!container) return;

      const h2Elements = Array.from(container.querySelectorAll('h2'));
      h2Elements.forEach((el, index) => {
        const text = el.textContent?.trim() ?? '';
        const id = el.id || `toc-${slugify(text)}-${index}`;
        el.id = id;
      });

      // Set up IntersectionObserver after IDs are assigned
      observerRef.current?.disconnect();

      const observer = new IntersectionObserver(
        (entries) => {
          // Pick the topmost visible heading
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

          if (visible.length > 0) {
            setActiveId(visible[0].target.id);
          }
        },
        { rootMargin: '-80px 0px -65% 0px', threshold: 0 }
      );

      headings.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });

      observerRef.current = observer;
    }, 100);

    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [headings]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
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
        <ul className='space-y-0.5'>
          {headings.map(({ id, text }) => {
            const isActive = activeId === id;
            return (
              <li key={id}>
                <button
                  onClick={() => handleClick(id)}
                  className={`w-full text-left text-sm leading-snug py-1.5 px-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-primary font-medium bg-primary/10'
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
