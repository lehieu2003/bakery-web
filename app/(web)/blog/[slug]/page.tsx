import type { Metadata } from 'next';
import BlogPostDetailScreen from '@/components/screens/BlogPostDetailScreen';
import { prisma } from '@/lib/prisma';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        title: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
      },
    });

    if (!post) {
      return {
        title: 'Bài viết không tồn tại | La Douceur',
        description: 'Bài viết bạn tìm kiếm hiện không khả dụng.',
      };
    }

    return {
      title: `${post.metaTitle ?? post.title} | La Douceur`,
      description:
        post.metaDescription ??
        post.excerpt ??
        'Đọc bài viết mới nhất từ La Douceur.',
    };
  } catch (error) {
    console.error('generateMetadata blog post error:', error);
    return {
      title: 'Blog | La Douceur',
      description: 'Đọc bài viết mới nhất từ La Douceur.',
    };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostDetailScreen slug={slug} />;
}
