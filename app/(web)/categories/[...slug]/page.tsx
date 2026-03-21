import CategoryScreen from '@/components/screens/CategoryScreen';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <CategoryScreen slugPath={slug} />;
}

