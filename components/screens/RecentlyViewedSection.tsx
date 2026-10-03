'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
} from '@/lib/recently-viewed';

// Read from localStorage after mount so SSR markup (empty) matches the first
// client render and the section simply appears for returning visitors.
export default function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <section className='py-12 px-4 lg:px-8' aria-labelledby='recently-viewed-heading'>
      <h2
        id='recently-viewed-heading'
        className='font-serif text-2xl md:text-3xl font-semibold text-primary text-center mb-8 text-balance'
      >
        Sản phẩm bạn vừa xem
      </h2>

      <div className='max-w-7xl mx-auto flex gap-4 overflow-x-auto pb-2' role='list'>
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            role='listitem'
            className='flex-shrink-0 w-40 md:w-48 group'
          >
            <div className='relative aspect-square rounded-2xl overflow-hidden border border-border/40 bg-secondary'>
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes='192px'
                  className='object-cover transition-transform group-hover:scale-105'
                />
              )}
            </div>
            <p className='mt-2 text-sm font-semibold text-primary line-clamp-2 leading-snug group-hover:opacity-80 transition-opacity'>
              {item.name}
            </p>
            <p className='text-sm font-bold text-accent'>
              {Number(item.price).toLocaleString('vi-VN')}đ
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
