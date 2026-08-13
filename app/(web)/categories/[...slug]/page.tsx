import type { Metadata } from 'next';
import CategoryScreen from '@/components/screens/CategoryScreen';
import { prisma } from '@/lib/prisma';

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

type Props = {
  params: Promise<{ slug: string[] }>;
};

function normalizeSlugSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const normalizedPath = slug.map(normalizeSlugSegment);
  const currentSlug = normalizedPath.at(-1);

  if (!currentSlug) {
    return {
      title: 'Danh mục sản phẩm',
      description: 'Khám phá các dòng bánh thủ công tại La Douceur.',
      alternates: { canonical: '/categories' },
    };
  }

  const category = await prisma.category.findFirst({
    where: {
      slug: currentSlug,
      isActive: true,
    },
    select: {
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
    },
  });

  if (!category) {
    return {
      title: 'Danh mục không tồn tại',
      description: 'Danh mục bạn tìm kiếm hiện không khả dụng tại La Douceur.',
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/categories/${normalizedPath.map(encodeURIComponent).join('/')}`;
  const description =
    category.description ||
    `Khám phá ${category.name.toLowerCase()} thủ công tại La Douceur, làm mới mỗi ngày từ nguyên liệu cao cấp.`;

  return {
    title: category.name,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: 'website',
      title: `${category.name} | La Douceur`,
      description,
      url: canonical,
      images: category.imageUrl
        ? [
            {
              url: category.imageUrl,
              alt: category.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${category.name} | La Douceur`,
      description,
      images: category.imageUrl ? [category.imageUrl] : undefined,
    },
  };
}

export default async function CategoryPage({
  params,
}: Props) {
  const { slug } = await params;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Trang chủ',
        item: siteUrl,
      },
      ...slug.map((segment, index) => {
        const path = slug.slice(0, index + 1).map(encodeURIComponent).join('/');
        return {
          '@type': 'ListItem',
          position: index + 2,
          name: normalizeSlugSegment(segment),
          item: `${siteUrl}/categories/${path}`,
        };
      }),
    ],
  };

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryScreen slugPath={slug} />
    </>
  );
}
