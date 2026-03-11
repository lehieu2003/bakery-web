'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Eye, Tag, User } from 'lucide-react';
import { usePublicBlogPost, usePublicBlogPosts } from '@/hooks/use-blog';
import type { BlogPost } from '@/types/api.types';
import TableOfContents from '@/components/web/TableOfContents';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjZjFlOWRmIi8+PC9zdmc+';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Related Post Mini Card ───────────────────────────────────────────────────
function RelatedPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className='group flex gap-3 items-start hover:text-primary transition-colors'
    >
      <div className='relative w-20 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-secondary'>
        {post.coverUrl ? (
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            loading='lazy'
            sizes='80px'
            className='object-cover transition-transform group-hover:scale-105'
          />
        ) : (
          <div className='absolute inset-0 bg-secondary' />
        )}
      </div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors'>
          {post.title}
        </p>
        {post.publishedAt && (
          <p className='text-xs text-muted-foreground mt-1'>
            {formatDate(post.publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className='py-10 animate-pulse'>
      <div className='h-4 bg-secondary rounded w-32 mb-8' />
      <div className='aspect-[16/7] bg-secondary rounded-2xl mb-8' />
      <div className='space-y-3 mb-8'>
        <div className='h-8 bg-secondary rounded w-3/4' />
        <div className='h-8 bg-secondary rounded w-1/2' />
      </div>
      <div className='space-y-3'>
        {[...Array(6)].map((_, i) => (
          <div key={i} className='h-4 bg-secondary rounded' />
        ))}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BlogPostDetailScreen({ slug }: { slug: string }) {
  const { data: post, isLoading, error } = usePublicBlogPost(slug);
  const { data: relatedData } = usePublicBlogPosts({ limit: 4 });
  const relatedPosts = (relatedData?.posts ?? [])
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  if (isLoading) return <Skeleton />;

  if (error || !post) {
    return (
      <div className='py-20 text-center'>
        <p className='font-serif text-2xl text-muted-foreground mb-4'>
          Không tìm thấy bài viết
        </p>
        <Link
          href='/blog'
          className='inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline'
        >
          <ArrowLeft size={14} /> Quay lại Blog
        </Link>
      </div>
    );
  }

  return (
    <article className='py-10'>
      {/* Breadcrumb / Back */}
      <nav className='mb-8' aria-label='Breadcrumb'>
        <Link
          href='/blog'
          className='inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors'
        >
          <ArrowLeft size={14} />
          Quay lại Blog
        </Link>
      </nav>

      <div className='flex flex-col-reverse lg:flex-row gap-10 lg:gap-12'>
        {/* Main Article */}
        <div className='flex-1 min-w-0'>
          {/* Category Badge */}
          {post.category && (
            <Link
              href={`/blog?category=${post.category.slug}`}
              className='inline-block px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase bg-primary/10 text-primary mb-4 hover:bg-primary/20 transition-colors'
            >
              {post.category.name}
            </Link>
          )}

          {/* Title */}
          <h1 className='font-serif text-3xl lg:text-5xl font-bold text-foreground leading-tight text-balance mb-4'>
            {post.title}
          </h1>

          {/* Excerpt */}
          {post.excerpt && (
            <p className='text-lg text-muted-foreground leading-relaxed mb-6 border-l-4 border-primary/30 pl-4'>
              {post.excerpt}
            </p>
          )}

          {/* Meta Row */}
          <div className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8 pb-6 border-b border-border'>
            {post.author && (
              <span className='flex items-center gap-1.5'>
                <User size={14} />
                {post.author.name}
              </span>
            )}
            {post.publishedAt && (
              <span className='flex items-center gap-1.5'>
                <Calendar size={14} />
                {formatDate(post.publishedAt)}
              </span>
            )}
            {post.viewCount > 0 && (
              <span className='flex items-center gap-1.5'>
                <Eye size={14} />
                {post.viewCount.toLocaleString()} lượt xem
              </span>
            )}
          </div>

          {/* Cover Image */}
          {post.coverUrl && (
            <div className='relative aspect-[16/7] rounded-2xl overflow-hidden mb-10 bg-secondary'>
              <Image
                src={post.coverUrl}
                alt={post.title}
                fill
                priority
                sizes='(max-width: 1024px) 100vw, 68vw'
                placeholder='blur'
                blurDataURL={PLACEHOLDER_BLUR}
                className='object-cover'
              />
            </div>
          )}

          {/* Content */}
          <div
            className='blog-content prose prose-sm lg:prose-base prose-headings:font-serif prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-img:rounded-xl max-w-none'
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-10 pt-6 border-t border-border'>
              <span className='text-xs text-muted-foreground flex items-center gap-1.5 mr-2'>
                <Tag size={12} /> Thẻ:
              </span>
              {post.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className='px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors'
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className='w-full lg:w-72 flex-shrink-0'>
          <div className='lg:sticky lg:top-40 space-y-5'>
            {/* Author Card */}
            {post.author && (
              <div className='bg-card rounded-2xl border border-border p-5'>
                <h3 className='font-serif text-sm font-semibold text-foreground mb-3 uppercase tracking-widest'>
                  Tác giả
                </h3>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold flex-shrink-0'>
                    {post.author.name.charAt(0)}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-foreground'>
                      {post.author.name}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      La Douceur Bakery
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table of Contents */}
            <TableOfContents content={post.content} />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className='bg-card rounded-2xl border border-border p-5'>
                <h3 className='font-serif text-sm font-semibold text-foreground mb-4 uppercase tracking-widest'>
                  Bài viết liên quan
                </h3>
                <div className='space-y-4'>
                  {relatedPosts.map((p) => (
                    <RelatedPostCard key={p.id} post={p} />
                  ))}
                </div>
                <Link
                  href='/blog'
                  className='mt-5 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline'
                >
                  Xem tất cả bài viết
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
