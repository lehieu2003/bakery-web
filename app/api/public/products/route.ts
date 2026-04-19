import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { apiError, apiSuccess, toApiJson } from '@/lib/api-response';
import {
  buildProductAttributeWhere,
  parseAttributeFilters,
} from '@/lib/product-attributes';

const productInclude: Prisma.ProductInclude = {
  categories: {
    include: {
      category: { select: { id: true, name: true, slug: true } },
    },
  },
  images: { orderBy: { displayOrder: 'asc' } },
  attributeAssignments: {
    include: {
      attribute: true,
      value: true,
    },
    orderBy: [{ attribute: { displayOrder: 'asc' } }, { createdAt: 'asc' }],
  },
};

type PublicProductsRouteDeps = {
  parseAttributeFilters: typeof parseAttributeFilters;
  buildProductAttributeWhere: typeof buildProductAttributeWhere;
  findChildCategories: (parentId: string) => Promise<Array<{ id: string }>>;
  findProducts: (args: {
    where: Record<string, unknown>;
    skip: number;
    take: number;
  }) => Promise<unknown[]>;
  countProducts: (args: { where: Record<string, unknown> }) => Promise<number>;
};

const defaultDeps: PublicProductsRouteDeps = {
  parseAttributeFilters,
  buildProductAttributeWhere,
  findChildCategories: (parentId) =>
    prisma.category.findMany({
      where: { parentId, isActive: true },
      select: { id: true },
    }),
  findProducts: ({ where, skip, take }) =>
    prisma.product.findMany({
      where,
      include: productInclude,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  countProducts: ({ where }) => prisma.product.count({ where }),
};

function normalizePositiveInt(
  value: string | null,
  fallback: number,
  min: number,
  max?: number,
) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  if (typeof max === 'number' && parsed > max) return max;
  return parsed;
}

export async function handleGetPublicProductsRequest(
  requestUrl: string,
  deps: PublicProductsRouteDeps = defaultDeps,
) {
  const { searchParams } = new URL(requestUrl);
  const page = normalizePositiveInt(searchParams.get('page'), 1, 1);
  const limit = normalizePositiveInt(searchParams.get('limit'), 20, 1, 60);
  const categoryId = searchParams.get('categoryId');
  const search = searchParams.get('search');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const inStock = searchParams.get('inStock') === 'true';
  const attributeFilters = deps.parseAttributeFilters(
    searchParams.getAll('attribute'),
  );

  const skip = (page - 1) * limit;

  const andConditions: Record<string, unknown>[] = [];
  const where: Record<string, unknown> = { isActive: true };
  if (categoryId) {
    const collectDescendantIds = async (parentId: string): Promise<string[]> => {
      const children = await deps.findChildCategories(parentId);
      const childIds = children.map((c) => c.id);
      const deeper = await Promise.all(childIds.map(collectDescendantIds));
      return [...childIds, ...deeper.flat()];
    };

    const descendantIds = await collectDescendantIds(categoryId);
    const categoryIds = [categoryId, ...descendantIds];
    where.categories = { some: { categoryId: { in: categoryIds } } };
  }
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }
  if (inStock) {
    andConditions.push({
      OR: [{ trackStock: false }, { stock: { gt: 0 } }],
    });
  }
  if (attributeFilters.length > 0) {
    andConditions.push(...deps.buildProductAttributeWhere(attributeFilters));
  }
  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  const [products, total] = await Promise.all([
    deps.findProducts({ where, skip, take: limit }),
    deps.countProducts({ where }),
  ]);

  return {
    status: 200,
    body: apiSuccess({
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
  };
}

// GET: List all products (public endpoint - no auth required)
export async function GET(request: NextRequest) {
  try {
    const result = await handleGetPublicProductsRequest(request.url);
    return toApiJson(result.body, result.status);
  } catch (error) {
    console.error('Get public products error:', error);
    return toApiJson(apiError('Failed to fetch products'), 500);
  }
}
