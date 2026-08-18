import type { Metadata } from 'next';
import ProductDetailScreen from '@/components/screens/ProductDetailScreen';
import { prisma } from '@/lib/prisma';

const siteUrl = (
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
).replace(/\/$/, '');

type Props = {
  params: Promise<{ id: string }>;
};

function toPlainText(value: string | null | undefined) {
  return value
    ?.replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function productDescription(product: {
  shortDescription: string | null;
  description: string | null;
  name: string;
}) {
  return (
    toPlainText(product.shortDescription) ||
    toPlainText(product.description) ||
    `Đặt ${product.name} tại Phương Loan Bakery - bánh thủ công làm mới mỗi ngày từ nguyên liệu cao cấp.`
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ id }, { slug: id }],
    },
    select: {
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      images: {
        orderBy: { displayOrder: 'asc' },
        select: { url: true, altText: true, isPrimary: true },
      },
    },
  });

  if (!product) {
    return {
      title: 'Sản phẩm không tồn tại',
      description:
        'Sản phẩm bạn tìm kiếm hiện không khả dụng tại Phương Loan Bakery.',
      robots: { index: false, follow: false },
    };
  }

  const primaryImage =
    product.images.find((image) => image.isPrimary) ?? product.images[0];
  const description = productDescription(product);

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      type: 'website',
      title: `${product.name} | Phương Loan Bakery`,
      description,
      url: `/products/${product.slug}`,
      images: primaryImage
        ? [
            {
              url: primaryImage.url,
              alt: primaryImage.altText ?? product.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | Phương Loan Bakery`,
      description,
      images: primaryImage ? [primaryImage.url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ id }, { slug: id }],
    },
    select: {
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      price: true,
      stock: true,
      trackStock: true,
      images: {
        orderBy: { displayOrder: 'asc' },
        select: { url: true, altText: true, isPrimary: true },
      },
    },
  });

  const primaryImage =
    product?.images.find((image) => image.isPrimary) ?? product?.images[0];
  const productJsonLd = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: productDescription(product),
        image: product.images.map((image) => image.url),
        brand: {
          '@type': 'Brand',
          name: 'Phương Loan Bakery',
        },
        offers: {
          '@type': 'Offer',
          url: `${siteUrl}/products/${product.slug}`,
          priceCurrency: 'VND',
          price: Number(product.price),
          availability:
            !product.trackStock || product.stock > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
        ...(primaryImage?.altText
          ? { alternateName: primaryImage.altText }
          : {}),
      }
    : null;

  return (
    <>
      {productJsonLd ? (
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      ) : null}
      <ProductDetailScreen productId={id} />
    </>
  );
}
