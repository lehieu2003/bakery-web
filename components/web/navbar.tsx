'use client';

import {
  ShoppingCart,
  Bell,
  Heart,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/providers/auth-provider';
import { useCategories, useProducts } from '@/hooks/use-products';
import {
  useInfiniteUserNotifications,
  useMarkNotificationAsRead,
  useUserNotifications,
} from '@/hooks/use-notifications';
import { useWishlist } from '@/hooks/use-wishlist';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Category, NotificationListItem, Product, ProductImage, WishlistItem } from '@/types/api.types';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { categoryHrefFromTrail } from '@/lib/category-path';
import { hasOrderSummary } from '@/lib/order-summary';

interface NavLink {
  label: string;
  href: string;
  children: {
    label: string;
    href: string;
    children: { label: string; href: string }[];
  }[];
}

export default function WebNavbar() {
  const { user, cart, orderSummaryOpen, setOrderSummaryOpen } = useCart();
  const { isLoading } = useAuth();
  const { data: categoriesData } = useCategories();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileCategory, setOpenMobileCategory] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navSlotRef = useRef<HTMLDivElement>(null);
  const navBarRef = useRef<HTMLDivElement>(null);
  const navOffsetTopRef = useRef(0);
  const notificationListRef = useRef<HTMLDivElement>(null);
  const notificationLoadMoreRef = useRef<HTMLDivElement>(null);
  const readingNotificationIdsRef = useRef<Set<string>>(new Set());
  const [isNavFixed, setIsNavFixed] = useState(false);
  const [navHeight, setNavHeight] = useState(0);
  const categoryNavRef = useRef<HTMLElement>(null);
  const [categoryNavEdges, setCategoryNavEdges] = useState({
    start: false,
    end: false,
  });
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const subscribe = useCallback(() => () => {}, []);
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const {
    data: notificationPages,
    isLoading: notificationsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteUserNotifications({
    limit: 10,
    enabled: mounted && !!user,
  });

  const { data: unreadMeta } = useUserNotifications(
    { page: 1, limit: 1, unreadOnly: true },
    { enabled: mounted && !!user },
  );
  const markAsReadMutation = useMarkNotificationAsRead();

  const notifications = useMemo(
    () => notificationPages?.pages.flatMap((p) => p.notifications) ?? [],
    [notificationPages],
  );
  const unreadCount = unreadMeta?.pagination.total ?? 0;
  const { data: wishlist = [], isLoading: wishlistLoading } = useWishlist({
    enabled: mounted && !!user,
  });
  const wishlistCount = wishlist.length;

  // Which ends of the category strip still have hidden items to scroll to.
  useEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;
    const update = () => {
      const start = nav.scrollLeft > 1;
      const end = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1;
      setCategoryNavEdges((prev) =>
        prev.start === start && prev.end === end ? prev : { start, end },
      );
    };
    update();
    nav.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => {
      nav.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [categoriesData]);

  const categoryNavMask = useMemo(() => {
    if (!categoryNavEdges.start && !categoryNavEdges.end) return undefined;
    const fade = '40px';
    const gradient = `linear-gradient(to right, ${
      categoryNavEdges.start ? `transparent, #000 ${fade}` : '#000'
    }, ${categoryNavEdges.end ? `#000 calc(100% - ${fade}), transparent` : '#000'})`;
    return { maskImage: gradient, WebkitMaskImage: gradient };
  }, [categoryNavEdges]);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search results query — only active when user has typed something
  const { data: searchData, isFetching: searchFetching } = useProducts(
    { search: debouncedSearch, limit: 6 },
    { enabled: debouncedSearch.length >= 1 },
  );
  const searchResults = searchData?.products ?? [];

  const handleSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!searchQuery.trim()) return;
      setSearchFocused(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    },
    [searchQuery, router],
  );

  const handleProductClick = useCallback(() => {
    setSearchFocused(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  // Build nav links dynamically from root categories, preserving children
  const navLinks = useMemo((): NavLink[] => {
    if (!categoriesData) return [];
    return categoriesData.map((cat: Category) => {
      const rootTrail = [cat];
      return {
        label: cat.name,
        href: categoryHrefFromTrail(rootTrail),
        children: (cat.children || []).map((child) => {
          const childTrail = [...rootTrail, child];
          return {
            label: child.name,
            href: categoryHrefFromTrail(childTrail),
            children: (child.children || []).map((grand) => ({
              label: grand.name,
              href: categoryHrefFromTrail([...childTrail, grand]),
            })),
          };
        }),
      };
    });
  }, [categoriesData]);
  const activeMegaMenu = navLinks.find(
    (link) => link.href === activeDropdown && link.children.length > 0,
  );

  useEffect(() => {
    const updateMeasurements = () => {
      const slot = navSlotRef.current;
      const nav = navBarRef.current;
      if (!slot || !nav) return;

      navOffsetTopRef.current =
        slot.getBoundingClientRect().top + window.scrollY;
      setNavHeight(nav.offsetHeight);
      setIsNavFixed(window.scrollY >= navOffsetTopRef.current);
    };

    const handleScroll = () => {
      setIsNavFixed(window.scrollY >= navOffsetTopRef.current);
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', updateMeasurements);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navLinks.length]);

  const handleMouseEnter = (href: string) => {
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setActiveDropdown(href);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 120);
  };

  // Infinite scroll inside notifications popover
  useEffect(() => {
    if (!notificationOpen) return;
    if (!notificationListRef.current || !notificationLoadMoreRef.current)
      return;

    const root = notificationListRef.current;
    const target = notificationLoadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [notificationOpen, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Mark unread notifications as read when visible in the scroll viewport
  useEffect(() => {
    if (!notificationOpen) return;
    if (!notificationListRef.current || notifications.length === 0) return;

    const root = notificationListRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target as HTMLDivElement;
          const id = element.dataset.notificationId;
          const read = element.dataset.read === 'true';

          if (!id || read) return;
          if (readingNotificationIdsRef.current.has(id)) return;

          readingNotificationIdsRef.current.add(id);
          markAsReadMutation.mutate(id, {
            onSettled: () => {
              readingNotificationIdsRef.current.delete(id);
            },
          });

          observer.unobserve(element);
        });
      },
      { root, threshold: 0.65 },
    );

    const unreadElements = root.querySelectorAll<HTMLDivElement>(
      '[data-notification-id][data-read="false"]',
    );
    unreadElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [notificationOpen, notifications, markAsReadMutation]);

  const formatNotificationTime = (iso: string | null | undefined) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('vi-VN');
  };

  const isExternalUrl = (url: string) => /^https?:\/\//i.test(url);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const renderNotificationItem = (item: NotificationListItem) => {
    const baseClass = `block w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${
      item.isRead
        ? 'bg-white hover:bg-gray-50'
        : 'bg-primary/5 hover:bg-primary/10'
    }`;
    const content = (
      <div className='flex items-start gap-3'>
        <div className='flex-col'>
          <div className='flex items-start justify-between gap-2'>
            <p
              className={`text-sm font-medium leading-snug ${
                item.isRead ? 'text-gray-700' : 'text-gray-900'
              }`}
            >
              {item.title}
            </p>
            {!item.isRead && (
              <span className='mt-1 size-2 rounded-full bg-primary shrink-0' />
            )}
          </div>
          <p className='text-xs text-gray-600 mt-1.5 line-clamp-2'>
            {item.content}
          </p>

          <p className='text-xs text-gray-400 mt-1.5'>
            {formatNotificationTime(item.publishedAt || item.createdAt)}
          </p>
        </div>
        {item.imageUrl && (
          <div className='mt-2 h-20 w-full max-w-[180px] overflow-hidden rounded-md border border-gray-100 bg-gray-50'>
            <Image
              src={item.imageUrl}
              alt={item.title}
              width={180}
              height={80}
              className='h-full w-full object-cover'
            />
          </div>
        )}
      </div>
    );

    if (!item.linkUrl) {
      return (
        <div
          key={item.id}
          data-notification-id={item.id}
          data-read={item.isRead ? 'true' : 'false'}
          className={baseClass}
        >
          {content}
        </div>
      );
    }

    if (isExternalUrl(item.linkUrl)) {
      return (
        <a
          key={item.id}
          href={item.linkUrl}
          target='_blank'
          rel='noreferrer'
          data-notification-id={item.id}
          data-read={item.isRead ? 'true' : 'false'}
          className={baseClass}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        key={item.id}
        href={item.linkUrl}
        data-notification-id={item.id}
        data-read={item.isRead ? 'true' : 'false'}
        className={baseClass}
        onClick={() => setNotificationOpen(false)}
      >
        {content}
      </Link>
    );
  };

  return (
    <header className='relative z-40 bg-white shadow-sm'>
      {/* Main header */}
      <div className='bg-white border-b border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-3 md:flex-nowrap lg:gap-6'>
          {/* Logo */}
          <Link
            href='/'
            className='order-1 flex-shrink-0'
            aria-label='Về trang chủ'
          >
            <Image
              src='/images/bakery-log.svg'
              alt='Phương Loan Bakery'
              width={156}
              height={52}
              priority
              className='h-10 w-auto md:h-13'
            />
          </Link>

          {/* Search bar */}
          <div
            className='order-3 w-full flex-none relative md:order-2 md:flex-1'
            ref={searchContainerRef}
          >
            <form onSubmit={handleSearchSubmit}>
              <input
                type='text'
                placeholder='Bạn tìm gì ở Phương Loan Bakery?'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className='w-full border border-gray-200 rounded-md px-4 py-2.5 pr-10 text-sm text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'
                autoComplete='off'
              />
              <button
                type='submit'
                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors'
                aria-label='Tìm kiếm'
              >
                {searchFetching ? (
                  <Loader2 size={18} className='animate-spin' />
                ) : (
                  <Search size={18} />
                )}
              </button>
            </form>

            {/* Search dropdown */}
            {searchFocused && debouncedSearch.length >= 1 && (
              <div className='absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden'>
                {searchFetching && searchResults.length === 0 ? (
                  <div className='flex items-center justify-center gap-2 py-6 text-sm text-gray-400'>
                    <Loader2 size={16} className='animate-spin' />
                    <span>Đang tìm kiếm...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className='py-6 text-center text-sm text-gray-400'>
                    Không tìm thấy sản phẩm nào cho &quot;{debouncedSearch}
                    &quot;
                  </div>
                ) : (
                  <>
                    <ul>
                      {searchResults.map((product: Product) => {
                        const primaryImage =
                          product.images?.find((img: ProductImage) => img.isPrimary) ??
                          product.images?.[0];
                        return (
                          <li key={product.id}>
                            <Link
                              href={`/products/${product.slug}`}
                              onClick={handleProductClick}
                              className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors'
                            >
                              <div className='w-10 h-10 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden'>
                                {primaryImage ? (
                                  <Image
                                    src={primaryImage.url}
                                    alt={primaryImage.altText ?? product.name}
                                    width={40}
                                    height={40}
                                    className='w-full h-full object-cover'
                                  />
                                ) : (
                                  <div className='w-full h-full bg-gray-200' />
                                )}
                              </div>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-medium text-gray-800 truncate'>
                                  {product.name}
                                </p>
                                <p className='text-xs text-primary font-semibold mt-0.5'>
                                  {product.price.toLocaleString('vi-VN')}đ
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className='border-t border-gray-100 px-4 py-2.5'>
                      <button
                        onClick={handleSearchSubmit}
                        className='w-full text-sm text-primary font-medium hover:underline text-center'
                      >
                        Xem tất cả kết quả cho &quot;{debouncedSearch}&quot;
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className='order-2 ml-auto flex items-center gap-3 flex-shrink-0 md:order-3 md:ml-0'>
            {/* Notifications */}
            {mounted && user && (
              <Popover
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    className='relative hidden items-center gap-1.5 text-gray-600 hover:text-primary transition-colors md:flex'
                    aria-label='Thông báo'
                  >
                    <div className='relative'>
                      <Bell size={24} />
                      {unreadCount > 0 && (
                        <span className='absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center px-1'>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align='end'
                  sideOffset={10}
                  className='w-[360px] p-0 border-gray-200'
                >
                  <div className='px-3 py-2.5 border-b border-gray-100'>
                    <p className='text-sm font-semibold text-gray-800'>
                      Thông báo
                    </p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      {unreadCount > 0
                        ? `${unreadCount} chưa đọc`
                        : 'Bạn đã đọc hết thông báo'}
                    </p>
                  </div>

                  <div
                    ref={notificationListRef}
                    className='max-h-[360px] overflow-y-auto overscroll-contain'
                  >
                    {notificationsLoading ? (
                      <div className='flex items-center justify-center gap-2 py-8 text-sm text-gray-400'>
                        <Loader2 size={16} className='animate-spin' />
                        <span>Đang tải thông báo...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className='py-8 text-center text-sm text-gray-400'>
                        Chưa có thông báo nào
                      </p>
                    ) : (
                      <>
                        {notifications.map((item) =>
                          renderNotificationItem(item),
                        )}
                        <div ref={notificationLoadMoreRef} className='h-2' />
                        {isFetchingNextPage && (
                          <div className='py-3 flex items-center justify-center text-gray-400'>
                            <Loader2 size={14} className='animate-spin' />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Cart */}
            {mounted && user && (
              <Popover open={wishlistOpen} onOpenChange={setWishlistOpen}>
                <PopoverTrigger asChild>
                  <button
                    className='relative hidden items-center gap-1.5 text-gray-600 hover:text-primary transition-colors md:flex'
                    aria-label='Sản phẩm yêu thích'
                  >
                    <div className='relative'>
                      <Heart size={24} />
                      {wishlistCount > 0 && (
                        <span className='absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center px-1'>
                          {wishlistCount > 99 ? '99+' : wishlistCount}
                        </span>
                      )}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align='end'
                  sideOffset={10}
                  className='w-[360px] p-0 border-gray-200'
                >
                  <div className='px-3 py-2.5 border-b border-gray-100'>
                    <p className='text-sm font-semibold text-gray-800'>
                      Sản phẩm yêu thích
                    </p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      {wishlistCount > 0
                        ? `${wishlistCount} sản phẩm`
                        : 'Chưa có sản phẩm yêu thích'}
                    </p>
                  </div>

                  <div className='max-h-[360px] overflow-y-auto overscroll-contain'>
                    {wishlistLoading ? (
                      <div className='flex items-center justify-center gap-2 py-8 text-sm text-gray-400'>
                        <Loader2 size={16} className='animate-spin' />
                        <span>Đang tải danh sách...</span>
                      </div>
                    ) : wishlistCount === 0 ? (
                      <p className='py-8 text-center text-sm text-gray-400'>
                        Bạn chưa thêm sản phẩm nào vào yêu thích
                      </p>
                    ) : (
                      <ul>
                        {wishlist.map((item: WishlistItem) => {
                          const product = item.product;
                          const primaryImage =
                            product?.images?.find((img: ProductImage) => img.isPrimary) ??
                            product?.images?.[0];
                          const productHref = product
                            ? `/products/${product.slug || product.id}`
                            : '#';

                          return (
                            <li key={item.id}>
                              {product ? (
                                <Link
                                  href={productHref}
                                  onClick={() => setWishlistOpen(false)}
                                  className='flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors'
                                >
                                  <div className='w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden'>
                                    {primaryImage ? (
                                      <Image
                                        src={primaryImage.url}
                                        alt={
                                          primaryImage.altText ?? product.name
                                        }
                                        width={48}
                                        height={48}
                                        className='w-full h-full object-cover'
                                      />
                                    ) : (
                                      <div className='w-full h-full bg-gray-200' />
                                    )}
                                  </div>
                                  <div className='min-w-0 flex-1'>
                                    <p className='text-sm font-medium text-gray-800 truncate'>
                                      {product.name}
                                    </p>
                                    <p className='text-xs text-primary font-semibold mt-0.5'>
                                      {product.price.toLocaleString('vi-VN')}đ
                                    </p>
                                  </div>
                                </Link>
                              ) : (
                                <div className='px-3 py-2.5 border-b border-gray-100 text-sm text-gray-500'>
                                  Sản phẩm không còn khả dụng
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* The cart is reachable from the header at every width; where
                the order summary drawer exists it opens that, else /cart. */}
            {(() => {
              const cartIcon = (
                <>
                  <div className='relative'>
                    <ShoppingCart size={26} />
                    {cartCount > 0 && (
                      <span className='absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center px-1'>
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span className='hidden md:block text-sm font-medium'>
                    {cartCount}
                  </span>
                </>
              );
              const cartClassName =
                'relative flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-gray-600 hover:text-primary transition-colors md:min-h-0 md:min-w-0';
              const cartLabel = `Giỏ hàng, ${cartCount} sản phẩm`;
              return hasOrderSummary(pathname) ? (
                <button
                  type='button'
                  onClick={() => setOrderSummaryOpen(true)}
                  className={cartClassName}
                  aria-label={cartLabel}
                  aria-haspopup='dialog'
                  aria-expanded={orderSummaryOpen}
                >
                  {cartIcon}
                </button>
              ) : (
                <Link href='/cart' className={cartClassName} aria-label={cartLabel}>
                  {cartIcon}
                </Link>
              );
            })()}

            {/* Profile */}
            {mounted && user ? (
              <Link
                href='/profile'
                className='hidden items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:border-primary/50 transition-colors md:flex'
                aria-label='Trang cá nhân'
              >
                <div className='w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0'>
                  {user.name.charAt(0)}
                </div>
                <span className='hidden lg:block text-sm font-medium text-gray-700'>
                  {user.name.split(' ')[0]}
                </span>
              </Link>
            ) : mounted && !isLoading ? (
              <Link
                href='/auth'
                className='hidden md:flex items-center gap-1.5 px-4 py-2 rounded-md border border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors'
                aria-label='Đăng nhập'
              >
                <User size={15} />
                Đăng nhập
              </Link>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors'
              aria-label='Mở/đóng menu'
            >
              {mobileMenuOpen ? (
                <X size={20} className='text-gray-600' />
              ) : (
                <Menu size={20} className='text-gray-600' />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar + mega-menu container */}
      <div
        ref={navSlotRef}
        className='hidden md:block'
        style={{ height: isNavFixed ? navHeight : undefined }}
      >
        <div
          ref={navBarRef}
          className={`bg-white border-b border-gray-100 shadow-sm ${
            isNavFixed ? 'fixed left-0 right-0 top-0 z-50' : 'relative z-40'
          }`}
          onMouseLeave={handleMouseLeave}
        >
          <div className='mx-auto flex items-center px-4 lg:px-8'>
            <Link
              href='/'
              className={`flex h-12 flex-shrink-0 items-center overflow-hidden transition-all duration-200 ${
                isNavFixed
                  ? 'mr-4 w-32 translate-x-0 opacity-100'
                  : 'pointer-events-none mr-0 w-0 -translate-x-2 opacity-0'
              }`}
              aria-label='Về trang chủ'
              tabIndex={isNavFixed ? 0 : -1}
            >
              <Image
                src='/images/bakery-log.svg'
                alt='Phương Loan Bakery'
                width={104}
                height={36}
                className='h-9 w-auto'
              />
            </Link>
            {/* safe-center: centred while it fits, start-aligned once it
                overflows, so the first category stays reachable. The edge
                fades mark the side that still scrolls (scrollbar is hidden). */}
            <nav
              ref={categoryNavRef}
              className='flex flex-1 items-center justify-center-safe overflow-x-auto scrollbar-hide'
              style={categoryNavMask}
              aria-label='Điều hướng danh mục'
            >
              {navLinks.map((link) => (
                <div
                  key={link.href}
                  className='relative'
                  onMouseEnter={() => handleMouseEnter(link.href)}
                >
                  {/* Top-level nav item */}
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 px-3 2xl:px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                      isActive(link.href)
                        ? 'text-primary border-primary'
                        : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                    }`}
                  >
                    {link.label}
                    {link.children.length > 0 && (
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 flex-shrink-0 ${
                          activeDropdown === link.href
                            ? 'rotate-180 text-primary'
                            : 'text-gray-400'
                        }`}
                      />
                    )}
                  </Link>
                </div>
              ))}
              <Link
                href='/blog'
                className={`flex items-center px-3 2xl:px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                  isActive('/blog')
                    ? 'text-primary border-primary'
                    : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Blog
              </Link>
              <Link
                href='/thanh-vien'
                className={`flex items-center px-3 2xl:px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                  isActive('/thanh-vien')
                    ? 'text-primary border-primary'
                    : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Thành viên
              </Link>
              <Link
                href='/store'
                className={`flex items-center px-3 2xl:px-4 py-3 text-sm font-semibold uppercase tracking-wide transition-colors border-b-2 whitespace-nowrap ${
                  isActive('/store')
                    ? 'text-primary border-primary'
                    : 'text-gray-700 border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Cửa hàng
              </Link>
            </nav>
            <div className='ml-4 hidden h-12 w-32 flex-shrink-0 lg:block' />
          </div>

          {/* Mega-menu panel */}
          {activeMegaMenu && (
            <div
              className='absolute left-0 right-0 top-full z-50 bg-white border-t border-gray-200 shadow-xl'
              onMouseEnter={() => handleMouseEnter(activeMegaMenu.href)}
            >
              <div className='max-w-7xl mx-auto px-4 lg:px-8 py-6'>
                {/* Columns: each child is a column */}
                <div
                  className='grid gap-x-8 gap-y-2'
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(activeMegaMenu.children.length, 5)}, minmax(0, 1fr))`,
                  }}
                >
                  {activeMegaMenu.children.map((child) => (
                    <div key={child.href} className='min-w-0'>
                      {/* Column header -> link to child category */}
                      <Link
                        href={child.href}
                        className={`block text-sm font-semibold mb-3 pb-1.5 border-b border-gray-100 transition-colors ${
                          isActive(child.href)
                            ? 'text-primary'
                            : 'text-gray-800 hover:text-primary'
                        }`}
                        onClick={() => setActiveDropdown(null)}
                      >
                        {child.label}
                      </Link>

                      {/* Grandchildren list */}
                      <ul className='space-y-1.5'>
                        {child.children.length > 0
                          ? child.children.map((grand) => (
                              <li key={grand.href}>
                                <Link
                                  href={grand.href}
                                  className={`block text-sm leading-snug transition-colors ${
                                    isActive(grand.href)
                                      ? 'text-primary font-medium'
                                      : 'text-gray-600 hover:text-primary'
                                  }`}
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  {grand.label}
                                </Link>
                              </li>
                            ))
                          : null}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden border-t border-gray-100 bg-white shadow-lg'>
          <nav className='max-w-7xl mx-auto px-4 py-4 space-y-1'>
            {navLinks.map((link) => (
              <div key={link.href}>
                <div className='flex items-center'>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex-1 flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(link.href)
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    <span className='uppercase tracking-wide'>
                      {link.label}
                    </span>
                  </Link>
                  {link.children.length > 0 && (
                    <button
                      onClick={() =>
                        setOpenMobileCategory(
                          openMobileCategory === link.href ? null : link.href,
                        )
                      }
                      className='p-2.5 text-gray-400 hover:text-primary transition-colors'
                      aria-label={`Toggle ${link.label} submenu`}
                    >
                      <ChevronDown
                        size={15}
                        className={`transition-transform duration-200 ${
                          openMobileCategory === link.href ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Mobile subcategories accordion */}
                {link.children.length > 0 &&
                  openMobileCategory === link.href && (
                    <div className='ml-4 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-3'>
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive(child.href)
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            ))}
            <Link
              href='/blog'
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/blog')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <span className='uppercase tracking-wide'>Blog</span>
            </Link>
            <Link
              href='/thanh-vien'
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/thanh-vien')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <span className='uppercase tracking-wide'>Thành viên</span>
            </Link>
            <Link
              href='/store'
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/store')
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <span className='uppercase tracking-wide'>Cửa hàng</span>
            </Link>
            {!user && !isLoading && (
              <Link
                href='/auth'
                onClick={() => setMobileMenuOpen(false)}
                className='flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors'
              >
                <User size={15} />
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
