'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import MembershipCard from '@/components/ui-custom/MembershipCard';
import Link from 'next/link';
import { useProducts, useCategories } from '@/hooks/use-products';

function ProductCard({
  product,
  href,
}: {
  product: { id: string; name: string; price: number; image: string };
  href: string;
}) {
  return (
    <Link
      href={href}
      className='group bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/40 transition-all hover:shadow-lg'
    >
      <div className='relative aspect-square bg-secondary overflow-hidden'>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className='object-cover transition-transform group-hover:scale-105'
        />
      </div>
      <div className='p-4'>
        <p className='font-sans text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1'>
          {product.name}
        </p>
        <p className='text-xs text-muted-foreground mt-1'>
          From {product.price.toLocaleString('vi-VN')}đ
        </p>
      </div>
    </Link>
  );
}

export default function HomeScreen() {
  const { user } = useCart();
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: categoriesData } = useCategories();

  // Get categories for filtering
  const categories = categoriesData || [];
  const cakeCategory = categories.find(
    (cat: { slug: string; name: string; id: string }) =>
      cat.slug === 'cakes' || cat.name.toLowerCase().includes('cake'),
  );
  const ingredientCategory = categories.find(
    (cat: { slug: string; name: string; id: string }) =>
      cat.slug === 'ingredients' ||
      cat.name.toLowerCase().includes('ingredient'),
  );

  // Filter products by category
  const products = productsData?.products || [];
  const cakes = products
    .filter(
      (p) =>
        p.isActive &&
        (cakeCategory ? p.categoryId === cakeCategory.id : p.isFeatured),
    )
    .slice(0, 4);
  const ingredients = products
    .filter(
      (p) =>
        p.isActive &&
        (ingredientCategory
          ? p.categoryId === ingredientCategory.id
          : !cakeCategory || p.categoryId !== cakeCategory.id),
    )
    .slice(0, 4);

  return (
    <div className='bg-background'>
      {/* Hero */}
      <section className='relative h-[560px] lg:h-[640px] w-full overflow-hidden'>
        <Image
          src='/images/hero-cake.jpg'
          alt='Signature hero cake'
          fill
          className='object-cover object-center'
          priority
        />
        <div className='absolute inset-0 bg-gradient-to-r from-foreground/65 via-foreground/30 to-transparent' />
        <div className='absolute inset-0 flex items-center'>
          <div className='max-w-7xl mx-auto px-6 lg:px-8 w-full'>
            <div className='max-w-xl'>
              <p className='text-white/70 text-xs tracking-[0.28em] uppercase font-sans font-light mb-4'>
                New Collection · 2025
              </p>
              <h1 className='font-serif text-4xl lg:text-6xl font-semibold text-white leading-tight text-balance mb-6'>
                Celebrate Every
                <br />
                Moment With
                <br />
                Our Signature Cakes
              </h1>
              <p className='text-white/75 text-base font-sans font-light leading-relaxed mb-8 max-w-sm'>
                Handcrafted with premium ingredients, each cake is a work of art
                made to order.
              </p>
              <div className='flex items-center gap-4'>
                <Link
                  href='/cakes'
                  className='px-8 py-3.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg'
                >
                  Explore Cakes
                </Link>
                <Link
                  href='/ingredients'
                  className='px-8 py-3.5 bg-white/15 backdrop-blur-sm text-white rounded-full text-sm font-medium hover:bg-white/25 transition-colors border border-white/30'
                >
                  Shop Ingredients
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Banner */}
      <section className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
        {user ? (
          <div className='max-w-xl'>
            <MembershipCard user={user} />
          </div>
        ) : (
          <Link
            href='/profile'
            className='rounded-2xl border border-border bg-card px-6 py-5 flex items-center justify-between hover:border-primary/40 transition-colors group'
          >
            <div>
              <p className='font-serif text-base font-semibold text-foreground'>
                Join Our Membership Club
              </p>
              <p className='text-muted-foreground text-sm mt-0.5'>
                Enjoy exclusive rewards and up to 15% off every order.
              </p>
            </div>
            <span className='flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-2.5 transition-all'>
              Join now <ArrowRight size={16} />
            </span>
          </Link>
        )}
      </section>

      {/* Signature Cakes */}
      <section className='max-w-7xl mx-auto px-6 lg:px-8 pb-14'>
        <div className='flex items-end justify-between mb-8'>
          <div>
            <p className='text-xs tracking-[0.22em] uppercase text-muted-foreground font-sans font-light mb-1.5'>
              Our Speciality
            </p>
            <h2 className='font-serif text-3xl font-semibold text-foreground'>
              Signature Cakes
            </h2>
          </div>
          <Link
            href='/cakes'
            className='flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all'
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
          {productsLoading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className='bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse'
              >
                <div className='aspect-square bg-secondary' />
                <div className='p-4 space-y-2'>
                  <div className='h-4 bg-secondary rounded' />
                  <div className='h-3 bg-secondary rounded w-2/3' />
                </div>
              </div>
            ))
          ) : cakes.length > 0 ? (
            cakes.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.imageUrl || '/images/placeholder.jpg',
                }}
                href={`/products/${p.id}`}
              />
            ))
          ) : (
            <div className='col-span-full text-center py-8 text-muted-foreground'>
              No products available
            </div>
          )}
        </div>
      </section>

      {/* Divider */}
      <div className='max-w-7xl mx-auto px-6 lg:px-8'>
        <div className='h-px bg-border' />
      </div>

      {/* Baking Ingredients */}
      <section className='max-w-7xl mx-auto px-6 lg:px-8 py-14'>
        <div className='flex items-end justify-between mb-8'>
          <div>
            <p className='text-xs tracking-[0.22em] uppercase text-muted-foreground font-sans font-light mb-1.5'>
              Premium Selection
            </p>
            <h2 className='font-serif text-3xl font-semibold text-foreground'>
              Baking Ingredients
            </h2>
          </div>
          <Link
            href='/ingredients'
            className='flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all'
          >
            View all <ArrowRight size={15} />
          </Link>
        </div>
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
          {productsLoading ? (
            // Loading skeleton
            [...Array(4)].map((_, i) => (
              <div
                key={i}
                className='bg-card rounded-2xl border border-border/50 overflow-hidden animate-pulse'
              >
                <div className='aspect-square bg-secondary' />
                <div className='p-4 space-y-2'>
                  <div className='h-4 bg-secondary rounded' />
                  <div className='h-3 bg-secondary rounded w-2/3' />
                </div>
              </div>
            ))
          ) : ingredients.length > 0 ? (
            ingredients.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  name: p.name,
                  price: p.price,
                  image: p.imageUrl || '/images/placeholder.jpg',
                }}
                href={`/products/${p.id}`}
              />
            ))
          ) : (
            <div className='col-span-full text-center py-8 text-muted-foreground'>
              No products available
            </div>
          )}
        </div>
      </section>

      {/* Value strip */}
      <section className='bg-card border-y border-border'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8'>
          {[
            {
              heading: 'Made to Order',
              body: 'Every cake is baked fresh specifically for your celebration, never off the shelf.',
            },
            {
              heading: 'Premium Ingredients',
              body: 'We source only the finest couverture chocolate, French butter, and organic eggs.',
            },
            {
              heading: 'Loyalty Rewards',
              body: 'Earn points on every order and unlock exclusive discounts at Gold and Platinum level.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} className='flex flex-col gap-2'>
              <h3 className='font-serif text-base font-semibold text-foreground'>
                {heading}
              </h3>
              <p className='text-sm text-muted-foreground leading-relaxed'>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
