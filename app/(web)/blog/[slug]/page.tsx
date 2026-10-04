import type { Metadata } from 'next';
import BlogPostDetailScreen from '@/components/screens/BlogPostDetailScreen';
import { prisma } from '@/lib/prisma';
import { safeJsonLdString } from '@/lib/json-ld';

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
).replace(/\/$/, '');

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        title: true,
        excerpt: true,
        slug: true,
        coverUrl: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    if (!post) {
      return {
        title: 'Bài viết không tồn tại',
        description: 'Bài viết bạn tìm kiếm hiện không khả dụng.',
      };
    }

    return {
      title: post.metaTitle ?? post.title,
      description:
        post.metaDescription ??
        post.excerpt ??
        'Đọc bài viết mới nhất từ Phương Loan Bakery.',
      alternates: {
        canonical: `/blog/${post.slug}`,
      },
      openGraph: {
        type: 'article',
        title: `${post.metaTitle ?? post.title} | Phương Loan Bakery`,
        description:
          post.metaDescription ??
          post.excerpt ??
          'Đọc bài viết mới nhất từ Phương Loan Bakery.',
        url: `/blog/${post.slug}`,
        images: post.coverUrl
          ? [
              {
                url: post.coverUrl,
                alt: post.title,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${post.metaTitle ?? post.title} | Phương Loan Bakery`,
        description:
          post.metaDescription ??
          post.excerpt ??
          'Đọc bài viết mới nhất từ Phương Loan Bakery.',
        images: post.coverUrl ? [post.coverUrl] : undefined,
      },
    };
  } catch (error) {
    console.error('generateMetadata blog post error:', error);
    return {
      title: 'Blog',
      description: 'Đọc bài viết mới nhất từ Phương Loan Bakery.',
    };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      title: true,
      slug: true,
      excerpt: true,
      coverUrl: true,
      publishedAt: true,
      updatedAt: true,
      author: {
        select: { name: true },
      },
    },
  });

  const articleJsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.excerpt ?? undefined,
        image: post.coverUrl ? [post.coverUrl] : undefined,
        datePublished: post.publishedAt?.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: {
          '@type': 'Person',
          name: post.author.name,
        },
        publisher: {
          '@type': 'Organization',
          name: 'Phương Loan Bakery',
        },
        mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
      }
    : null;

  return (
    <>
      {articleJsonLd ? (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: safeJsonLdString(articleJsonLd),
          }}
        />
      ) : null}
      <BlogPostDetailScreen slug={slug} />
    </>
  );
}
