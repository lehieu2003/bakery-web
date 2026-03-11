import type { Metadata } from 'next';
import BlogScreen from '@/components/screens/BlogScreen';

export const metadata: Metadata = {
  title: 'Blog & Câu chuyện | La Douceur',
  description:
    'Khám phá công thức, mẹo làm bánh và những câu chuyện thú vị từ đội ngũ thợ bánh La Douceur.',
};

export default function BlogPage() {
  return <BlogScreen />;
}
