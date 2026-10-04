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

type ActiveCategoryRow = { id: string; parentId: string | null };

type PublicProductsRouteDeps = {
  parseAttributeFilters: typeof parseAttributeFilters;
  buildProductAttributeWhere: typeof buildProductAttributeWhere;
  listActiveCategories: () => Promise<ActiveCategoryRow[]>;
  findProducts: (args: {
    where: Record<string, unknown>;
    skip: number;
    take: number;
    orderBy: Record<string, unknown>[];
  }) => Promise<unknown[]>;
  countProducts: (args: { where: Record<string, unknown> }) => Promise<number>;
};

const CATEGORY_TREE_TTL_MS = 60_000;
let activeCategoryCache: { rows: ActiveCategoryRow[]; expiresAt: number } | null =
  null;

const defaultDeps: PublicProductsRouteDeps = {
  parseAttributeFilters,
  buildProductAttributeWhere,
  listActiveCategories: () => {
    // Categories change rarely; a short TTL cache keeps the tree lookup off
    // the DB for most requests on this high-latency database setup.
    if (activeCategoryCache && activeCategoryCache.expiresAt > Date.now()) {
      return Promise.resolve(activeCategoryCache.rows);
    }
    return prisma.category
      .findMany({
        where: { isActive: true },
        select: { id: true, parentId: true },
      })
      .then((rows) => {
        activeCategoryCache = {
          rows,
          expiresAt: Date.now() + CATEGORY_TREE_TTL_MS,
        };
        return rows;
      });
  },
  findProducts: ({ where, skip, take, orderBy }) =>
    prisma.product.findMany({
      where,
      include: productInclude,
      skip,
      take,
      orderBy,
    }),
  countProducts: ({ where }) => prisma.product.count({ where }),
};

const SORT_ORDERINGS: Record<string, Record<string, unknown>[]> = {
  popular: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  newest: [{ createdAt: 'desc' }],
  'price-asc': [{ price: 'asc' }],
  'price-desc': [{ price: 'desc' }],
};

function resolveSortOrdering(sort: string | null): Record<string, unknown>[] {
  return SORT_ORDERINGS[sort ?? 'popular'] ?? SORT_ORDERINGS.popular;
}

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
  const orderBy = resolveSortOrdering(searchParams.get('sort'));

  const skip = (page - 1) * limit;

  const andConditions: Record<string, unknown>[] = [];
  const where: Record<string, unknown> = { isActive: true };
  if (categoryId) {
    // One flat query + in-memory traversal replaces per-level recursion.
    const categories = await deps.listActiveCategories();
    const childrenByParent = new Map<string, string[]>();
    for (const row of categories) {
      if (!row.parentId) continue;
      const children = childrenByParent.get(row.parentId) ?? [];
      children.push(row.id);
      childrenByParent.set(row.parentId, children);
    }

    const descendantIds: string[] = [];
    const queue = [categoryId];
    while (queue.length > 0) {
      const current = queue.pop() as string;
      for (const childId of childrenByParent.get(current) ?? []) {
        descendantIds.push(childId);
        queue.push(childId);
      }
    }

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
    deps.findProducts({ where, skip, take: limit, orderBy }),
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
