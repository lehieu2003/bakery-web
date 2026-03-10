'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { getProductImage } from '@/lib/utils';
import MembershipCard from '@/components/ui-custom/MembershipCard';
import BannerCarousel from '@/components/ui-custom/BannerCarousel';
import Link from 'next/link';
import { useProducts, useCategories } from '@/hooks/use-products';
import { useBanners } from '@/hooks/use-banners';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

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
          loading='lazy'
          sizes='(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
          placeholder='blur'
          blurDataURL={PLACEHOLDER_BLUR}
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
  const { data: banners, isLoading: bannersLoading } = useBanners();

  // Root categories from API (dynamic)
  const categories = categoriesData || [];

  // Collect all category IDs including children for filtering
  const getCategoryIds = (cat: { id: string; children?: { id: string }[] }) => {
    const ids = [cat.id];
    if ((cat as any).children)
      ids.push(...(cat as any).children.map((c: { id: string }) => c.id));
    return ids;
  };

  // Group products by root category
  const products = productsData?.products || [];
  const productsByCategory = categories.map((cat) => {
    const catIds = getCategoryIds(cat);
    return {
      category: cat,
      products: products
        .filter(
          (p) =>
            p.isActive &&
            (p.categories || []).some((pc) => catIds.includes(pc.categoryId)),
        )
        .slice(0, 4),
    };
  });

  // First category link for hero CTA
  const firstCategoryHref =
    categories.length > 0 ? `/categories/${categories[0].slug}` : '/';
  const secondCategoryHref =
    categories.length > 1
      ? `/categories/${categories[1].slug}`
      : firstCategoryHref;

  return (
    <div className='bg-background -mx-4 lg:-mx-8'>
      {/* Banner Carousel - full width, breaks out of parent padding */}
      {!bannersLoading && banners && banners.length > 0 && (
        <BannerCarousel
          banners={banners.filter((b) => b.isActive)}
          clickable={false}
        />
      )}

      {/* Inner padded content */}
      <div className='px-4 lg:px-8'>
        {/* Membership Banner */}
        <section className='py-8'>
          {user ? (
            <div className='max-w-xl'>
              <MembershipCard user={user!} />
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

        {/* Category Sections */}
        {productsByCategory.map(
          ({ category: cat, products: catProducts }, idx) => (
            <section key={cat.id}>
              {idx > 0 && <div className='h-px bg-border' />}
              <div className='py-12'>
                <div className='flex items-end justify-between mb-8'>
                  <div>
                    {cat.description && (
                      <p className='text-xs tracking-[0.22em] uppercase text-muted-foreground font-sans font-light mb-1.5'>
                        {cat.description}
                      </p>
                    )}
                    <h2 className='font-serif text-3xl font-semibold text-foreground'>
                      {cat.name}
                    </h2>
                  </div>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className='flex items-center gap-1.5 text-sm font-medium text-primary hover:gap-2.5 transition-all'
                  >
                    View all <ArrowRight size={15} />
                  </Link>
                </div>
                <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
                  {productsLoading ? (
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
                  ) : catProducts.length > 0 ? (
                    catProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={{
                          id: p.id,
                          name: p.name,
                          price: p.price,
                          image: getProductImage(p),
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
              </div>
            </section>
          ),
        )}

        {/* Value strip */}
        <section className='bg-card border border-border rounded-2xl my-8'>
          <div className='px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8'>
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
    </div>
  );
}
