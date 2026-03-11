import type { Metadata } from 'next';
import BlogPostDetailScreen from '@/components/screens/BlogPostDetailScreen';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `Bài viết | La Douceur`,
    description: `Đọc bài viết ${slug} trên blog La Douceur.`,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostDetailScreen slug={slug} />;
}
