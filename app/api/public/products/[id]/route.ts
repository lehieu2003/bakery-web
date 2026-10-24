import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type PublicProductReviewRecord = {
  id?: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null };
};

// The rest of the product record (images, categories, variants, ...) passes
// through unchanged; only `id` and `reviews` are load-bearing for the handler.
export type PublicProductDetailRecord = {
  id: string;
  reviews: PublicProductReviewRecord[];
  reviewCount?: number;
  ratingAverage?: number | null;
  [key: string]: unknown;
};

export type ReviewStatsSummary = { total: number; average: number | null };

// Error responses carry no data; `data: never` keeps `data` readable (and
// required) on the union so callers can access it without narrowing.
type PublicProductRouteResult<TData> = {
  status: number;
  body:
    | { success: true; data: TData }
    | { success: false; error: string; data: never };
};

function productDetailError(
  status: number,
  error: string,
): PublicProductRouteResult<never> {
  return { status, body: { success: false, error, data: undefined as never } };
}

export type PublicProductDetailDeps = {
  findProductDetail: (
    idOrSlug: string,
  ) => Promise<PublicProductDetailRecord | null>;
  getReviewStats: (productId: string) => Promise<ReviewStatsSummary>;
};

const publicProductDetailDeps: PublicProductDetailDeps = {
  findProductDetail: (idOrSlug) =>
    prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
        attributeAssignments: {
          include: {
            attribute: true,
            value: true,
          },
          orderBy: [{ attribute: { displayOrder: 'asc' } }, { createdAt: 'asc' }],
        },
        reviews: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    }),
  getReviewStats: async (productId) => {
    const stats = await prisma.review.aggregate({
      where: { productId },
      _count: true,
      _avg: { rating: true },
    });
    return {
      total: stats._count,
      average: stats._avg.rating == null ? null : Number(stats._avg.rating),
    };
  },
};

// GET: Get single product by ID or slug (public endpoint - no auth required)
export async function handleGetPublicProductRequest(
  request: string | URL,
  params: { id: string },
  deps: PublicProductDetailDeps = publicProductDetailDeps,
): Promise<PublicProductRouteResult<{ product: PublicProductDetailRecord }>> {
  try {
    // Try to find by ID first, then by slug
    const product = await deps.findProductDetail(params.id);

    if (!product) {
      return productDetailError(404, 'Không tìm thấy sản phẩm');
    }

    const stats = await deps.getReviewStats(product.id);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          product: {
            ...product,
            reviewCount: stats.total,
            ratingAverage:
              stats.average == null
                ? null
                : Math.round(stats.average * 10) / 10,
          },
        },
      },
    };
  } catch (error) {
    console.error('Get public product error:', error);
    return productDetailError(500, 'Không tải được sản phẩm');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await handleGetPublicProductRequest(request.url, { id });
  return NextResponse.json(result.body, { status: result.status });
}
