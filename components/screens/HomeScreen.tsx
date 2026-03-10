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
import type { Category } from '@/types/api.types';

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

  // Collect all category IDs including children + grandchildren for filtering
  const getCategoryIds = (cat: {
    id: string;
    children?: Category[];
  }): string[] => {
    const ids = [cat.id];
    if (cat.children) {
      for (const child of cat.children) {
        ids.push(...getCategoryIds(child));
      }
    }
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
                {cat.children && cat.children.length > 0 && (
                  <div className='flex flex-wrap gap-2 mb-6'>
                    {cat.children.map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/categories/${cat.slug}?sub=${sub.id}`}
                        className='px-4 py-1.5 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors'
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
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

      </div>

      {/* ── La Douceur – About section ── */}
      <section className='px-4 lg:px-8 py-16 bg-[#faf8f5]'>
        <div className='max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
          {/* Text side */}
          <div className='order-2 lg:order-1'>
            <p className='text-xs tracking-[0.25em] uppercase text-muted-foreground font-sans font-light mb-3'>
              Chuỗi tiệm bánh kết hợp không gian F&B tại TP.HCM
            </p>
            <h2 className='font-serif text-2xl lg:text-3xl font-semibold text-primary leading-snug mb-6 text-balance'>
              LA DOUCEUR – TIỆM BÁNH NGON Ở SÀI GÒN VỚI KHÔNG GIAN ĂN UỐNG
              THOẢI MÁI
            </h2>
            <div className='space-y-4 text-sm text-foreground leading-relaxed'>
              <p>
                La Douceur là{' '}
                <strong>tiệm bánh ngon ở Sài Gòn</strong> được nhiều khách hàng
                lựa chọn nhờ sự kết hợp hài hòa giữa bánh chất lượng, nước
                uống đa dạng và{' '}
                <strong>không gian ngồi lại thoải mái</strong>. Với hệ thống{' '}
                <strong>8 chi nhánh tại TP.HCM</strong>, La Douceur không chỉ
                là nơi mua bánh mang đi mà còn là điểm hẹn quen thuộc cho gia
                đình, nhóm bạn hay những buổi gặp gỡ cuối tuần.
              </p>
              <p>
                Các dòng bánh nổi bật tại La Douceur gồm{' '}
                <strong>bánh nướng phô mai tan chảy – best seller</strong>,
                bánh cookies đa dạng và bánh lạnh nhẹ nhàng như su kem,
                tiramisu, panna cotta. Bên cạnh đó, menu{' '}
                <strong>nước uống dùng tại chỗ</strong> giúp trải nghiệm thưởng
                thức bánh trở nên trọn vẹn và thư giãn hơn.
              </p>
              <p>
                Nhờ không gian hiện đại, dễ chịu cùng menu phong phú, La
                Douceur dần trở thành{' '}
                <strong>tiệm bánh ngon tại TP.HCM</strong> phù hợp cho nhiều
                nhu cầu: ăn nhẹ, trò chuyện, hẹn hò hay đưa trẻ nhỏ đi chơi
                cuối tuần.
              </p>
            </div>
          </div>
          {/* Image side */}
          <div className='order-1 lg:order-2 relative aspect-[4/3] rounded-2xl overflow-hidden'>
            <Image
              src='/images/bakery-kitchen.jpg'
              alt='Đội ngũ thợ làm bánh La Douceur đang làm việc trong bếp bánh chuyên nghiệp'
              fill
              className='object-cover'
              sizes='(max-width: 1024px) 100vw, 50vw'
            />
          </div>
        </div>
      </section>

      {/* ── Parallax Stats Banner ── */}
      <section
        className='relative w-full py-20 overflow-hidden'
        style={{
          backgroundImage: "url('/images/stats-bg.jpg')",
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className='absolute inset-0 bg-black/60' />
        <div className='relative z-10 max-w-4xl mx-auto px-4 lg:px-8'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-10 text-center text-white'>
            {/* Stat 1 */}
            <div className='flex flex-col items-center gap-3'>
              <svg
                width='56'
                height='56'
                viewBox='0 0 56 56'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='opacity-90'
                aria-hidden='true'
              >
                <rect
                  x='8'
                  y='12'
                  width='40'
                  height='32'
                  rx='2'
                  stroke='white'
                  strokeWidth='2'
                />
                <path
                  d='M8 20h40M18 12v8M38 12v8'
                  stroke='white'
                  strokeWidth='2'
                />
                <path
                  d='M16 28h8M16 34h16'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
              <div>
                <p className='text-4xl font-bold text-[#e8c49a]'>+ 120</p>
                <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                  Loại bánh
                </p>
              </div>
            </div>
            {/* Stat 2 */}
            <div className='flex flex-col items-center gap-3'>
              <svg
                width='56'
                height='56'
                viewBox='0 0 56 56'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='opacity-90'
                aria-hidden='true'
              >
                <circle cx='28' cy='16' r='8' stroke='white' strokeWidth='2' />
                <path
                  d='M14 44c0-7.732 6.268-14 14-14s14 6.268 14 14'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <path
                  d='M28 30v6M24 36h8'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
              </svg>
              <div>
                <p className='text-4xl font-bold text-[#e8c49a]'>+ 1000</p>
                <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                  Khách hàng mỗi ngày
                </p>
              </div>
            </div>
            {/* Stat 3 */}
            <div className='flex flex-col items-center gap-3'>
              <svg
                width='56'
                height='56'
                viewBox='0 0 56 56'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
                className='opacity-90'
                aria-hidden='true'
              >
                <path
                  d='M28 10c-8 0-14 5-14 12 0 5 3 9 8 11v5h12v-5c5-2 8-6 8-11 0-7-6-12-14-12z'
                  stroke='white'
                  strokeWidth='2'
                />
                <path
                  d='M22 38h12M24 43h8'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <path
                  d='M22 24l4 4 8-8'
                  stroke='white'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
              <div>
                <p className='text-4xl font-bold text-[#e8c49a]'>+ 4</p>
                <p className='text-xs tracking-[0.2em] uppercase mt-1 text-white/80'>
                  Năm kinh nghiệm
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='px-4 lg:px-8'>
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
