'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Search, Calendar, Eye, Tag, ArrowRight, X } from 'lucide-react';
import {
  usePublicBlogPosts,
  usePublicBlogCategories,
  usePublicBlogTags,
} from '@/hooks/use-blog';
import type { BlogPost, BlogCategory, BlogTag } from '@/types/api.types';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iI2YxZTlkZiIvPjwvc3ZnPg==';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ─── Hero Featured Post Card ──────────────────────────────────────────────────
function FeaturedPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className='group relative block rounded-3xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-xl'
      aria-label={`Read featured post: ${post.title}`}
    >
      {/* Cover Image */}
      <div className='relative aspect-[16/7] bg-secondary overflow-hidden'>
        <Image
          src={post.coverUrl ?? ''}
          alt={post.title}
          fill
          priority
          sizes='(max-width: 768px) 100vw, 80vw'
          placeholder='blur'
          blurDataURL={PLACEHOLDER_BLUR}
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />

        {/* Gradient overlay */}
        <div className='absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent' />

        {/* Overlay content */}
        <div className='absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white'>
          {post.category && (
            <span className='inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-primary/90 text-primary-foreground mb-3'>
              {post.category.name}
            </span>
          )}
          <h2 className='font-serif text-2xl lg:text-4xl font-bold leading-tight mb-3 text-balance group-hover:text-primary-foreground/90 transition-colors'>
            {post.title}
          </h2>
          {post.excerpt && (
            <p className='text-sm lg:text-base text-white/80 line-clamp-2 leading-relaxed max-w-2xl'>
              {post.excerpt}
            </p>
          )}
          <div className='flex items-center gap-4 mt-4 text-xs text-white/70'>
            {post.publishedAt && (
              <span className='flex items-center gap-1.5'>
                <Calendar size={13} />
                {formatDate(post.publishedAt)}
              </span>
            )}
            {post.viewCount > 0 && (
              <span className='flex items-center gap-1.5'>
                <Eye size={13} />
                {post.viewCount.toLocaleString()} lượt xem
              </span>
            )}
            <span className='ml-auto flex items-center gap-1.5 font-medium text-white group-hover:gap-2.5 transition-all'>
              Đọc bài viết <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Regular Blog Post Card ───────────────────────────────────────────────────
function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className='group flex flex-col bg-card rounded-2xl border border-border/70 overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all'
      aria-label={`Read: ${post.title}`}
    >
      {/* Thumbnail */}
      <div className='relative aspect-[16/9] bg-secondary overflow-hidden flex-shrink-0'>
        <Image
          src={post.coverUrl ?? ''}
          alt={post.title}
          fill
          loading='lazy'
          sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          placeholder='blur'
          blurDataURL={PLACEHOLDER_BLUR}
          className='object-cover transition-transform duration-500 group-hover:scale-105'
        />

        {post.category && (
          <span className='absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase bg-primary text-primary-foreground shadow-sm'>
            {post.category.name}
          </span>
        )}
      </div>

      {/* Body */}
      <div className='flex flex-col flex-1 p-5'>
        <h3 className='font-serif text-base font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2 text-balance'>
          {post.title}
        </h3>
        {post.excerpt && (
          <p className='text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4 flex-1'>
            {post.excerpt}
          </p>
        )}

        {/* Footer row */}
        <div className='flex items-center justify-between mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground'>
          <div className='flex items-center gap-3'>
            {post.publishedAt && (
              <span className='flex items-center gap-1'>
                <Calendar size={12} />
                {formatDate(post.publishedAt)}
              </span>
            )}
            {post.viewCount > 0 && (
              <span className='flex items-center gap-1'>
                <Eye size={12} />
                {post.viewCount.toLocaleString()}
              </span>
            )}
          </div>
          <span className='flex items-center gap-1 text-primary font-medium group-hover:gap-1.5 transition-all'>
            Đọc <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton Cards ───────────────────────────────────────────────────────────
function SkeletonFeatured() {
  return (
    <div className='rounded-3xl overflow-hidden border border-border animate-pulse'>
      <div className='aspect-[16/7] bg-secondary' />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className='rounded-2xl overflow-hidden border border-border animate-pulse'>
      <div className='aspect-[16/9] bg-secondary' />
      <div className='p-5 space-y-3'>
        <div className='h-4 bg-secondary rounded w-3/4' />
        <div className='h-3 bg-secondary rounded' />
        <div className='h-3 bg-secondary rounded w-5/6' />
        <div className='h-3 bg-secondary rounded w-2/3' />
      </div>
    </div>
  );
}

// ─── Sidebar – Categories ─────────────────────────────────────────────────────
function CategoryFilter({
  categories,
  activeSlug,
  onSelect,
}: {
  categories: BlogCategory[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <div className='bg-card rounded-2xl border border-border p-5'>
      <h3 className='font-serif text-sm font-semibold text-foreground mb-4 uppercase tracking-widest'>
        Danh mục
      </h3>
      <ul className='space-y-1'>
        <li>
          <button
            onClick={() => onSelect('')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
              activeSlug === ''
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            Tất cả bài viết
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => onSelect(cat.slug)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                activeSlug === cat.slug
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span>{cat.name}</span>
              {cat._count !== undefined && (
                <span className='text-xs text-muted-foreground/60'>
                  {cat._count.posts}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Sidebar – Tags ───────────────────────────────────────────────────────────
function TagCloud({
  tags,
  activeSlug,
  onSelect,
}: {
  tags: BlogTag[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className='bg-card rounded-2xl border border-border p-5'>
      <h3 className='font-serif text-sm font-semibold text-foreground mb-4 uppercase tracking-widest'>
        Thẻ
      </h3>
      <div className='flex flex-wrap gap-2'>
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onSelect(activeSlug === tag.slug ? '' : tag.slug)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeSlug === tag.slug
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
            }`}
          >
            <Tag size={10} />
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav
      className='flex items-center justify-center gap-2 mt-10'
      aria-label='Phân trang blog'
    >
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className='px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none'
      >
        Trước
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`min-w-[36px] h-9 rounded-lg border text-sm font-medium transition-colors ${
            p === page
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className='px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none'
      >
        Sau
      </button>
    </nav>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BlogScreen() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategorySlug, setActiveCategorySlug] = useState('');
  const [activeTagSlug, setActiveTagSlug] = useState('');

  const { data, isLoading } = usePublicBlogPosts({
    page,
    limit: 9,
    search: search || undefined,
    categorySlug: activeCategorySlug || undefined,
    tagSlug: activeTagSlug || undefined,
  });
  const { data: categories = [] } = usePublicBlogCategories();
  const { data: tags = [] } = usePublicBlogTags();

  const posts = data?.posts ?? [];
  const pagination = data?.pagination;
  const featuredPost =
    page === 1 && !search && !activeCategorySlug && !activeTagSlug
      ? posts[0]
      : null;
  const remainingPosts = featuredPost ? posts.slice(1) : posts;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
    setActiveCategorySlug('');
    setActiveTagSlug('');
  };

  const handleCategorySelect = (slug: string) => {
    setActiveCategorySlug(slug);
    setActiveTagSlug('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const handleTagSelect = (slug: string) => {
    setActiveTagSlug(slug);
    setActiveCategorySlug('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const clearFilters = () => {
    setActiveCategorySlug('');
    setActiveTagSlug('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  const hasActiveFilter = !!(search || activeCategorySlug || activeTagSlug);

  return (
    <div className='py-10'>
      {/* Page Header */}
      <header className='mb-10'>
        <p className='text-xs tracking-[0.25em] uppercase text-muted-foreground font-sans font-light mb-2'>
          Từ bếp bánh Phương Loan Bakery
        </p>
        <h1 className='font-serif text-4xl lg:text-5xl font-bold text-foreground text-balance mb-4'>
          Blog & Câu chuyện
        </h1>
        <p className='text-muted-foreground text-base leading-relaxed max-w-xl'>
          Khám phá công thức, mẹo làm bánh và những câu chuyện thú vị từ đội ngũ
          thợ bánh Phương Loan Bakery.
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className='mt-6 flex items-center gap-2 max-w-md'
        >
          <div className='relative flex-1'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
            />
            <input
              type='search'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='Tìm kiếm bài viết...'
              className='w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors'
            />
          </div>
          <button
            type='submit'
            className='px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors'
          >
            Tìm
          </button>
        </form>

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className='flex flex-wrap gap-2 mt-4 items-center'>
            <span className='text-xs text-muted-foreground'>Đang lọc:</span>
            {search && (
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary'>
                &quot;{search}&quot;
              </span>
            )}
            {activeCategorySlug && (
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary'>
                {categories.find((c: BlogCategory) => c.slug === activeCategorySlug)?.name ??
                  activeCategorySlug}
              </span>
            )}
            {activeTagSlug && (
              <span className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary'>
                #
                {tags.find((t: BlogTag) => t.slug === activeTagSlug)?.name ??
                  activeTagSlug}
              </span>
            )}
            <button
              onClick={clearFilters}
              className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors'
            >
              <X size={11} /> Xóa bộ lọc
            </button>
          </div>
        )}
      </header>

      {/* Main Layout: Content + Sidebar */}
      <div className='flex flex-col lg:flex-row gap-10'>
        {/* Left: Posts */}
        <main className='flex-1 min-w-0'>
          {/* Featured Post */}
          {isLoading ? (
            <SkeletonFeatured />
          ) : featuredPost ? (
            <div className='mb-10'>
              <FeaturedPostCard post={featuredPost} />
            </div>
          ) : null}

          {/* Posts Grid */}
          {isLoading ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : remainingPosts.length > 0 ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
              {remainingPosts.map((post: BlogPost) => (
                <BlogPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className='text-center py-20'>
              <p className='font-serif text-xl text-muted-foreground mb-2'>
                Chưa có bài viết nào
              </p>
              <p className='text-sm text-muted-foreground/60'>
                {hasActiveFilter
                  ? 'Không tìm thấy bài viết phù hợp với bộ lọc hiện tại.'
                  : 'Hãy quay lại sau nhé!'}
              </p>
              {hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className='mt-4 text-sm text-primary font-medium hover:underline'
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : null}

          {/* Pagination */}
          {pagination && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </main>

        {/* Right: Sidebar */}
        <aside className='w-full lg:w-72 flex-shrink-0 space-y-6'>
          <CategoryFilter
            categories={categories}
            activeSlug={activeCategorySlug}
            onSelect={handleCategorySelect}
          />
          <TagCloud
            tags={tags}
            activeSlug={activeTagSlug}
            onSelect={handleTagSelect}
          />
        </aside>
      </div>
    </div>
  );
}
