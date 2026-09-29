import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus, requireUserFromRequest } from '@/lib/rbac';
import type { CreateReviewRequest } from '@/types/api.types';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;
const MAX_COMMENT_LENGTH = 2000;

type ReviewRequestLike = {
  json: () => Promise<unknown>;
  headers?: Pick<Headers, 'get'>;
};

type ReviewRecord = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null };
};

// Error responses carry no data; `data: never` keeps `data` readable (and
// required) on the union so callers can access it without narrowing.
type ReviewsRouteResult<TData> = {
  status: number;
  body:
    | { success: true; data: TData }
    | { success: false; error: string; data: never };
};

function reviewError(status: number, error: string): ReviewsRouteResult<never> {
  return { status, body: { success: false, error, data: undefined as never } };
}

export type ReviewsRouteDeps = {
  requireUser: (request: ReviewRequestLike) => Promise<{ id: string }>;
  findActiveProduct: (productId: string) => Promise<{ id: string } | null>;
  listReviews: (args: {
    productId: string;
    skip: number;
    take: number;
  }) => Promise<{ reviews: ReviewRecord[]; total: number }>;
  upsertReview: (input: {
    userId: string;
    productId: string;
    rating: number;
    comment: string | null;
  }) => Promise<ReviewRecord>;
};

const reviewsRouteDeps: ReviewsRouteDeps = {
  requireUser: (request) => requireUserFromRequest(request as NextRequest),
  findActiveProduct: (productId) =>
    prisma.product.findFirst({
      where: { id: productId, isActive: true },
      select: { id: true },
    }),
  listReviews: async ({ productId, skip, take }) => {
    const where = { productId };
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.review.count({ where }),
    ]);
    return { reviews, total };
  },
  upsertReview: ({ userId, productId, rating, comment }) =>
    prisma.review.upsert({
      where: { userId_productId: { userId, productId } },
      update: { rating, comment },
      create: { userId, productId, rating, comment },
      include: { user: { select: { id: true, name: true } } },
    }),
};

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_PAGE;
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

// GET /api/products/[id]/reviews - List reviews for a product (public)
export async function handleListReviewsRequest(
  request: string | URL,
  params: { id: string },
  deps: ReviewsRouteDeps = reviewsRouteDeps,
): Promise<
  ReviewsRouteResult<{
    reviews: ReviewRecord[];
    pagination: { page: number; limit: number; total: number };
  }>
> {
  try {
    const url = new URL(request);
    const page = parsePage(url.searchParams.get('page'));
    const limit = parseLimit(url.searchParams.get('limit'));

    const { reviews, total } = await deps.listReviews({
      productId: params.id,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      status: 200,
      body: {
        success: true,
        data: {
          reviews,
          pagination: { page, limit, total },
        },
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch reviews';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return reviewError(status, message);
    }
    console.error('List reviews error:', error);
    return reviewError(500, 'Failed to fetch reviews');
  }
}

// POST /api/products/[id]/reviews - Create or update the current user's review
export async function handleCreateReviewRequest(
  request: ReviewRequestLike,
  params: { id: string },
  deps: ReviewsRouteDeps = reviewsRouteDeps,
): Promise<ReviewsRouteResult<{ review: ReviewRecord }>> {
  try {
    const user = await deps.requireUser(request);
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return reviewError(400, 'Invalid review payload');
    }

    const payload = body as CreateReviewRequest;
    const rating: unknown = payload.rating;
    if (
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return reviewError(
        400,
        'Rating must be an integer between 1 and 5',
      );
    }

    let comment: string | null = null;
    if (payload.comment !== undefined && payload.comment !== null) {
      if (typeof payload.comment !== 'string') {
        return reviewError(400, 'Comment must be a string');
      }
      const trimmed = payload.comment.trim();
      if (trimmed.length > MAX_COMMENT_LENGTH) {
        return reviewError(
          400,
          `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`,
        );
      }
      comment = trimmed.length > 0 ? trimmed : null;
    }

    const product = await deps.findActiveProduct(params.id);
    if (!product) {
      return reviewError(404, 'Product not found');
    }

    const review = await deps.upsertReview({
      userId: user.id,
      productId: params.id,
      rating,
      comment,
    });

    return {
      status: 200,
      body: { success: true, data: { review } },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to submit review';
    const status = mapAuthErrorToStatus(message);
    if (status !== 500) {
      return reviewError(status, message);
    }
    console.error('Create review error:', error);
    return reviewError(500, 'Failed to submit review');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await handleListReviewsRequest(request.url, { id });
  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await handleCreateReviewRequest(request, { id });
  return NextResponse.json(result.body, { status: result.status });
}
