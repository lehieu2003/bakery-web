import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';

type AdminUser = {
  id: string;
  role: UserRole;
};

type BlogCategoryPayload = {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type AdminBlogCategoriesDeps = {
  requireAdmin: () => Promise<AdminUser>;
  listCategories: () => Promise<unknown[]>;
  findCategoryBySlug: (slug: string) => Promise<{ id: string } | null>;
  createCategory: (payload: BlogCategoryPayload) => Promise<unknown>;
};

const defaultDeps: AdminBlogCategoriesDeps = {
  requireAdmin,
  listCategories: () =>
    prisma.blogCategory.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { displayOrder: 'asc' },
    }),
  findCategoryBySlug: (slug) =>
    prisma.blogCategory.findUnique({
      where: { slug },
      select: { id: true },
    }),
  createCategory: (payload) =>
    prisma.blogCategory.create({
      data: payload,
      include: { _count: { select: { posts: true } } },
    }),
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function normalizeOptionalString(raw: unknown, fieldName: string) {
  if (raw === undefined || raw === null || raw === '') return { value: null as string | null };
  if (typeof raw !== 'string') return { error: `${fieldName} must be a string` } as const;
  return { value: raw.trim() || null };
}

function parseCategoryPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid payload' } as const;
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'name is required' } as const;

  const slug = slugify((typeof body.slug === 'string' ? body.slug : name) || '');
  if (!slug) return { error: 'slug is required' } as const;

  const displayOrderRaw = body.displayOrder ?? 0;
  if (typeof displayOrderRaw !== 'number' || !Number.isInteger(displayOrderRaw) || displayOrderRaw < 0) {
    return { error: 'displayOrder must be a non-negative integer' } as const;
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return { error: 'isActive must be a boolean' } as const;
  }

  const descriptionResult = normalizeOptionalString(body.description, 'description');
  if ('error' in descriptionResult) return { error: descriptionResult.error } as const;
  const imageResult = normalizeOptionalString(body.imageUrl, 'imageUrl');
  if ('error' in imageResult) return { error: imageResult.error } as const;

  return {
    payload: {
      name,
      slug,
      description: descriptionResult.value,
      imageUrl: imageResult.value,
      displayOrder: displayOrderRaw,
      isActive: body.isActive ?? true,
    } satisfies BlogCategoryPayload,
  } as const;
}

export async function handleAdminBlogCategoriesGetRequest(
  deps: AdminBlogCategoriesDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const categories = await deps.listCategories();
  return { status: 200, body: { success: true, data: { categories } } };
}

export async function handleAdminBlogCategoriesPostRequest(
  request: NextRequest,
  deps: AdminBlogCategoriesDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const parsed = parseCategoryPayload(await request.json());
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const existing = await deps.findCategoryBySlug(parsed.payload.slug);
  if (existing) {
    return { status: 400, body: { success: false, error: 'Slug already exists' } };
  }

  const category = await deps.createCategory(parsed.payload);
  return { status: 200, body: { success: true, data: category } };
}

// GET /api/admin/blog/categories
export async function GET() {
  try {
    const result = await handleAdminBlogCategoriesGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin blog categories list error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// POST /api/admin/blog/categories
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminBlogCategoriesPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin create blog category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
