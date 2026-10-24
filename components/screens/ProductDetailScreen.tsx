'use client';

import Image from 'next/image';
import {
  ChevronLeft,
  Heart,
  Pause,
  Play,
  ShoppingBag,
  Star,
  ZoomIn,
  X,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useCart } from '@/lib/cart-store';
import { useCategories, useProductDetail } from '@/hooks/use-products';
import { getProductImage, getProductImages } from '@/lib/utils';
import Link from 'next/link';
import { ProductVariant } from '@/types/api.types';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import RelatedProducts from '@/components/screens/RelatedProducts';
import BestSellersSection from '@/components/screens/BestSellersSection';
import ProductReviewsSection from '@/components/web/product-reviews';
import {
  categoryHrefFromTrail,
  findCategoryTrailById,
} from '@/lib/category-path';
import { useToggleWishlist } from '@/hooks/use-wishlist';
import { recordRecentlyViewed } from '@/lib/recently-viewed';
import { useAuth } from '@/providers/auth-provider';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import { usePathname, useRouter } from 'next/navigation';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==';

interface ProductDetailScreenProps {
  productId: string;
}

export default function ProductDetailScreen({
  productId,
}: ProductDetailScreenProps) {
  const { user, addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {
    data: selectedProduct,
    isLoading,
    error,
  } = useProductDetail(productId);
  const { isFavorite, toggleFavorite, isToggling } = useToggleWishlist(
    selectedProduct?.id,
  );
  const { data: categoriesData } = useCategories();
  const membershipBenefitsQuery = useMembershipBenefits({
    enabled: Boolean(user),
  });
  const memberDiscountPercent =
    membershipBenefitsQuery.data?.benefits.currentTier.discountPercent ?? 0;
  const memberTierLabel =
    membershipBenefitsQuery.data?.benefits.currentTier.label ?? '';
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const autoplayRef = useRef(
    Autoplay({
      delay: 3000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    autoplayRef.current,
  ]);
  const [autoPlayOn, setAutoPlayOn] = useState(true);

  const toggleAutoPlay = () => {
    if (autoPlayOn) {
      autoplayRef.current.stop();
      setAutoPlayOn(false);
    } else {
      autoplayRef.current.play();
      setAutoPlayOn(true);
    }
  };

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveImageIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  const [message, setMessage] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  // Earliest pickup is tomorrow; computed once (Date.now() is impure, so it
  // must not run on every render).
  const [minPickupDate] = useState(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (zoomOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [zoomOpen]);

  const variants = useMemo(
    () => selectedProduct?.variants ?? [],
    [selectedProduct?.variants],
  );

  // Auto-select first variant when product loads
  useEffect(() => {
    if (variants.length > 0 && !selectedVariant) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  // Remember this product for the "Sản phẩm bạn vừa xem" strip on the home page
  useEffect(() => {
    if (!selectedProduct) return;
    recordRecentlyViewed({
      id: selectedProduct.id,
      slug: selectedProduct.slug ?? null,
      name: selectedProduct.name,
      price: Number(selectedVariant?.price ?? selectedProduct.price),
      image: getProductImage(selectedProduct),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  if (isLoading) {
    return (
      <div className='bg-background'>
        <div className='border-b border-border/60 bg-card'>
          <div className='max-w-7xl mx-auto px-6 lg:px-8 py-4'>
            <div className='h-5 w-32 bg-secondary rounded animate-pulse' />
          </div>
        </div>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16'>
            <div className='space-y-4'>
              <div className='aspect-square bg-secondary rounded-2xl animate-pulse' />
              <div className='flex gap-3'>
                <div className='w-20 h-20 bg-secondary rounded-xl animate-pulse' />
                <div className='w-20 h-20 bg-secondary rounded-xl animate-pulse' />
              </div>
            </div>
            <div className='space-y-4'>
              <div className='h-9 bg-secondary rounded w-3/4 animate-pulse' />
              <div className='h-7 bg-secondary rounded w-1/3 animate-pulse' />
              <div className='h-4 bg-secondary rounded w-full animate-pulse' />
              <div className='h-4 bg-secondary rounded w-2/3 animate-pulse' />
              <div className='h-px bg-border my-6' />
              <div className='h-12 bg-secondary rounded-full animate-pulse' />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !selectedProduct) {
    return (
      <div className='bg-background min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-destructive mb-4'>Không tìm thấy sản phẩm</p>
          <Link
            href='/'
            className='text-primary hover:underline text-sm font-medium'
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }


  const firstCategory = selectedProduct.categories?.[0]?.category;
  const categoryName = firstCategory?.name;
  const categoryTrail = firstCategory?.id
    ? findCategoryTrailById(categoriesData || [], firstCategory.id)
    : undefined;
  const categoryHref = categoryTrail
    ? categoryHrefFromTrail(categoryTrail)
    : '/';

  // Cake-like personalisation (message, pickup date) only makes sense for
  // bakery products; ingredients/drinks are told apart by their root category.
  const INGREDIENT_ROOT_SLUGS = new Set([
    'do-pha-che',
    'do-lam-banh',
    'do-uong',
    'ingredients',
  ]);
  const rootCategorySlug = categoryTrail?.[0]?.slug;
  const isCake =
    rootCategorySlug != null
      ? !INGREDIENT_ROOT_SLUGS.has(rootCategorySlug)
      : (selectedProduct.categories || []).length > 0;

  function handleAddToCart() {
    const variantSuffix = selectedVariant ? `-${selectedVariant.id}` : '';
    addToCart({
      id: selectedProduct!.id + variantSuffix,
      productId: selectedProduct!.id,
      name: selectedProduct!.name,
      price: selectedVariant?.price ?? selectedProduct!.price,
      image: getProductImage(selectedProduct!),
      type: isCake ? ('cake' as const) : ('ingredient' as const),
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      message: isCake ? message : undefined,
      pickupDate: isCake ? pickupDate : undefined,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  async function handleToggleFavorite() {
    if (!selectedProduct) return;

    if (!isAuthenticated) {
      const redirectPath = pathname || `/products/${selectedProduct.id}`;
      router.push(`/auth?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    await toggleFavorite();
  }

  return (
    <div className='bg-background'>
      {/* Breadcrumb */}
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-4'>
          <Link
            href={categoryHref}
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <ChevronLeft size={16} />
            {categoryName || 'Back'}
          </Link>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16'>
          {/* Left: Image Gallery */}
          <div className='space-y-3'>
            {/* Embla main carousel */}
            <div className='relative rounded-2xl bg-secondary aspect-square overflow-hidden'>
              <div className='overflow-hidden h-full w-full' ref={emblaRef}>
                <div className='flex h-full'>
                  {getProductImages(selectedProduct).map((src, i) => (
                    <div
                      key={i}
                      className='relative flex-shrink-0 w-full h-full'
                    >
                      <Image
                        src={src}
                        alt={`${selectedProduct.name} - view ${i + 1}`}
                        fill
                        className='object-cover'
                        priority={i === 0}
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Zoom trigger button */}
              <button
                type='button'
                onClick={() => setZoomOpen(true)}
                aria-label='Zoom image'
                className='absolute bottom-3 right-3 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors focus-visible:outline-none focus:ring-2 focus:ring-white/60'
              >
                <ZoomIn size={17} />
              </button>
            </div>

            {/* Fullscreen lightbox */}
            {zoomOpen && (
              <div
                className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 animate-[fadeIn_0.2s_ease]'
                onClick={() => setZoomOpen(false)}
                role='dialog'
                aria-modal='true'
                aria-label='Image zoom view'
              >
                {/* Close button */}
                <button
                  type='button'
                  onClick={() => setZoomOpen(false)}
                  aria-label='Close zoom view'
                  className='absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors focus-visible:outline-none focus:ring-2 focus:ring-white/60'
                >
                  <X size={20} />
                </button>

                {/* Image container — stop propagation so clicking image doesn't close */}
                <div
                  className='relative w-full h-full max-w-4xl max-h-[90vh] mx-6'
                  onClick={(e) => e.stopPropagation()}
                >
                  <Image
                    src={getProductImages(selectedProduct)[activeImageIndex]}
                    alt={`${selectedProduct.name} - zoomed`}
                    fill
                    className='object-contain'
                    sizes='(max-width: 768px) 100vw, 896px'
                    priority
                  />
                </div>
              </div>
            )}

            {/* Counter + dots */}
            {getProductImages(selectedProduct).length > 1 && (
              <div className='flex items-center justify-between px-1'>
                {/* Dot indicators — 24×24 hit targets (WCAG 2.2), dot visual inside */}
                <div className='flex gap-0'>
                  {getProductImages(selectedProduct).map((_, i) => (
                    <button
                      key={i}
                      type='button'
                      onClick={() => scrollTo(i)}
                      className='flex h-6 w-6 items-center justify-center rounded-full'
                      aria-label={`Ảnh ${i + 1}`}
                    >
                      <span
                        className={`rounded-full transition-all ${
                          i === activeImageIndex
                            ? 'h-2 w-5 bg-primary'
                            : 'h-2 w-2 bg-border hover:bg-primary/40'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className='flex items-center gap-2'>
                  <span className='text-xs text-muted-foreground'>
                    {activeImageIndex + 1} /{' '}
                    {getProductImages(selectedProduct).length}
                  </span>
                  <button
                    type='button'
                    onClick={toggleAutoPlay}
                    aria-label={
                      autoPlayOn
                        ? 'Tạm dừng tự động chuyển ảnh'
                        : 'Tiếp tục tự động chuyển ảnh'
                    }
                    className='flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground'
                  >
                    {autoPlayOn ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Thumbnail strip */}
            {getProductImages(selectedProduct).length > 1 && (
              <div className='flex gap-2 overflow-x-auto pb-1'>
                {getProductImages(selectedProduct).map((src, i) => (
                  <button
                    key={i}
                    type='button'
                    onClick={() => scrollTo(i)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-secondary border-2 transition-colors ${
                      i === activeImageIndex
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`View ${i + 1}`}
                      fill
                      loading='lazy'
                      sizes='80px'
                      placeholder='blur'
                      blurDataURL={PLACEHOLDER_BLUR}
                      className='object-cover'
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details + Options */}
          <div className='flex flex-col'>
            <h1 className='font-serif text-3xl lg:text-4xl font-semibold text-foreground text-balance mb-3'>
              {selectedProduct.name}
            </h1>

            <div className='flex items-center gap-4 mb-4'>
              <span className='font-sans text-2xl font-bold text-accent'>
                {Number(
                  selectedVariant?.price ?? selectedProduct.price
                ).toLocaleString('vi-VN')}
                đ
              </span>
              {(selectedProduct.reviewCount ?? 0) > 0 && (
                <div className='flex items-center gap-1'>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i <= Math.round(selectedProduct.ratingAverage ?? 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-border'
                      }
                    />
                  ))}
                  <span className='text-xs text-muted-foreground ml-1'>
                    ({selectedProduct.reviewCount} đánh giá)
                  </span>
                </div>
              )}
            </div>

            {user && memberTierLabel && memberDiscountPercent > 0 && (
              <div className='mb-5 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20'>
                <p className='text-xs text-primary font-medium'>
                  Ưu đãi hạng {memberTierLabel}: giảm {memberDiscountPercent}%
                  khi thanh toán.
                </p>
              </div>
            )}

            <p className='text-sm text-muted-foreground leading-relaxed mb-6'>
              {selectedProduct.description ||
                'Bánh thủ công được làm mới mỗi ngày với nguyên liệu tuyển chọn.'}
            </p>

            <ProductReviewsSection
              productId={selectedProduct.id}
              reviewCount={selectedProduct.reviewCount ?? 0}
              ratingAverage={selectedProduct.ratingAverage ?? null}
            />

            <div className='h-px bg-border mb-6' />

            {/* Cake customisation */}
            {isCake && (
              <div className='space-y-5 mb-6'>
                {variants.length > 0 && (
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                      Kích cỡ
                    </p>
                    <div className='flex gap-2 flex-wrap'>
                      {variants.map((v: ProductVariant) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                            selectedVariant?.id === v.id
                              ? 'bg-primary text-white border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {v.name}
                          {v.price !== selectedProduct.price && (
                            <span className='ml-1.5 text-xs opacity-75'>
                              ({Number(v.price).toLocaleString('vi-VN')}đ)
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block'>
                    Viết chữ lên bánh
                  </label>
                  <input
                    type='text'
                    placeholder='VD: Chúc mừng sinh nhật Lan!'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={40}
                    className='w-full text-sm bg-card rounded-xl px-4 py-3 border border-border focus-visible:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors'
                  />
                  <p className='text-xs text-muted-foreground mt-1.5 text-right'>
                    {message.length}/40
                  </p>
                </div>

                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block'>
                    Ngày nhận bánh
                  </label>
                  <input
                    type='date'
                    value={pickupDate}
                    min={minPickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className='w-full text-sm bg-card rounded-xl px-4 py-3 border border-border focus-visible:outline-none focus:border-primary text-foreground transition-colors'
                  />
                  <p className='text-xs text-muted-foreground mt-1.5'>
                    Bánh làm theo đơn nên vui lòng đặt trước ít nhất 1 ngày.
                  </p>
                  <div className='mt-3 bg-secondary/60 rounded-xl px-4 py-3 space-y-1.5'>
                    <p className='text-xs text-foreground'>
                      <span className='font-semibold'>Bảo quản:</span> tủ lạnh
                      0–4°C, ngon nhất trong 2–3 ngày; để ngoài 15–20 phút trước
                      khi thưởng thức.
                    </p>
                    <p className='text-xs text-foreground'>
                      <span className='font-semibold'>Nhận bánh:</span> tại cửa
                      hàng hoặc giao hàng tại Quảng Ngãi (phí giao hiển thị ở
                      bước thanh toán).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Ingredient specs */}
            {!isCake && (
              <div className='space-y-5 mb-6'>
                {variants.length > 0 && (
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                      Quy cách
                    </p>
                    <div className='flex gap-2 flex-wrap'>
                      {variants.map((v: ProductVariant) => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                            selectedVariant?.id === v.id
                              ? 'bg-primary text-white border-primary'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                          }`}
                        >
                          {v.name}
                          {v.price !== selectedProduct.price && (
                            <span className='ml-1.5 text-xs opacity-75'>
                              ({Number(v.price).toLocaleString('vi-VN')}đ)
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className='bg-card rounded-2xl border border-border/50 p-5 space-y-3'>
                  {[
                    {
                      label: 'Trọng lượng',
                      value: selectedVariant?.name ?? 'Theo quy cách đóng gói',
                    },
                    {
                      label: 'Xuất xứ',
                      value: 'Nhập khẩu',
                    },
                    {
                      label: 'Hạn sử dụng',
                      value: '12 tháng từ ngày sản xuất',
                    },
                    {
                      label: 'Bảo quản',
                      value: 'Nơi khô mát, tránh ánh nắng trực tiếp',
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className='flex items-center justify-between py-1.5 border-b border-border/50 last:border-0'
                    >
                      <span className='text-sm text-muted-foreground'>
                        {label}
                      </span>
                      <span className='text-sm font-medium text-foreground'>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(selectedProduct.stock ?? 0) <= 10 && (selectedProduct.stock ?? 0) > 0 && (
              <p className='text-xs font-medium text-primary mb-2'>
                Chỉ còn {selectedProduct.stock} chiếc hôm nay — đặt sớm để giữ
                bánh!
              </p>
            )}

            <div className='flex items-center gap-3'>
              {/* Quantity stepper */}
              <div className='flex items-center gap-1 border border-border rounded-full px-2 py-1.5 bg-card'>
                <button
                  type='button'
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className='p-1.5 text-muted-foreground hover:text-foreground transition-colors'
                  aria-label='Giảm số lượng'
                >
                  −
                </button>
                <span className='text-sm font-semibold text-foreground w-6 text-center'>
                  {quantity}
                </span>
                <button
                  type='button'
                  onClick={() => setQuantity((q) => q + 1)}
                  className='p-1.5 text-muted-foreground hover:text-foreground transition-colors'
                  aria-label='Tăng số lượng'
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              <button
                onClick={handleAddToCart}
                disabled={(selectedProduct.stock ?? 0) <= 0}
                className={`flex-1 py-4 rounded-full font-medium text-sm shadow-md flex items-center justify-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  added
                    ? 'bg-accent text-white'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                <ShoppingBag size={17} />
                {(selectedProduct.stock ?? 0) <= 0
                  ? 'Hết hàng'
                  : added
                    ? 'Đã thêm vào giỏ hàng!'
                    : `Thêm ${quantity > 1 ? `${quantity} món` : 'vào giỏ'}`}
              </button>

              <button
                type='button'
                onClick={handleToggleFavorite}
                disabled={isToggling}
                aria-label={
                  isFavorite
                    ? 'Xoá khỏi danh sách yêu thích'
                    : 'Thêm vào danh sách yêu thích'
                }
                className='h-12 w-12 rounded-full border border-border bg-card text-foreground flex items-center justify-center transition-colors hover:border-primary/40 disabled:opacity-60'
              >
                <Heart
                  size={18}
                  className={
                    isFavorite ? 'fill-red-500 text-red-500' : 'text-foreground'
                  }
                />
              </button>
            </div>

            {!user && (
              <p className='text-xs text-muted-foreground text-center mt-3'>
                <Link
                  href='/profile'
                  className='text-primary underline underline-offset-2'
                >
                  Đăng nhập
                </Link>{' '}
                để nhận ưu đãi hạng thành viên.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts productId={productId} />
      <BestSellersSection surface='product-detail' />
    </div>
  );
}
