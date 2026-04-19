import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type BlogCategoryUpdatePayload = Partial<{
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}>;

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type AdminBlogCategoryByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findCategoryById: (id: string) => Promise<{ id: string; name: string } | null>;
  findCategoryDetailById: (id: string) => Promise<unknown | null>;
  findCategoryBySlugExcludingId: (slug: string, id: string) => Promise<{ id: string } | null>;
  updateCategoryById: (id: string, payload: BlogCategoryUpdatePayload) => Promise<unknown>;
  countPostsByCategoryId: (id: string) => Promise<number>;
  deleteCategoryById: (id: string) => Promise<void>;
  writeAdminAudit?: (payload: {
    module: string;
    entity: string;
    entityId: string;
    mutationType: string;
    summary: string;
    actorUserId?: string | null;
    actorRole?: UserRole | null;
    correlation: {
      requestId: string;
      route: string;
      httpMethod: string;
      orderId?: string | null;
      paymentId?: string | null;
      transactionId?: string | null;
      attempt?: number | null;
    };
  }) => Promise<void>;
};

const defaultDeps: AdminBlogCategoryByIdDeps = {
  requireAdmin,
  findCategoryById: (id) =>
    prisma.blogCategory.findUnique({
      where: { id },
      select: { id: true, name: true },
    }),
  findCategoryDetailById: (id) =>
    prisma.blogCategory.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    }),
  findCategoryBySlugExcludingId: (slug, id) =>
    prisma.blogCategory.findFirst({
      where: { slug, id: { not: id } },
      select: { id: true },
    }),
  updateCategoryById: (id, payload) =>
    prisma.blogCategory.update({
      where: { id },
      data: payload,
      include: { _count: { select: { posts: true } } },
    }),
  countPostsByCategoryId: (id) => prisma.blogPost.count({ where: { categoryId: id } }),
  deleteCategoryById: async (id) => {
    await prisma.blogCategory.delete({ where: { id } });
  },
  writeAdminAudit: writeAdminActionAuditLog,
};


function normalizeOptionalString(raw: unknown, fieldName: string) {
  if (raw === undefined) return { skipped: true as const };
  if (raw === null || raw === '') return { value: null as string | null };
  if (typeof raw !== 'string') return { error: `${fieldName} must be a string` } as const;
  return { value: raw.trim() || null };
}

function parseCategoryUpdatePayload(raw: unknown, existingName: string) {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid payload' } as const;
  const body = raw as Record<string, unknown>;
  const payload: BlogCategoryUpdatePayload = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return { error: 'name must be a non-empty string' } as const;
    }
    payload.name = body.name.trim();
  }

  if (body.slug !== undefined) {
    if (typeof body.slug !== 'string') return { error: 'slug must be a string' } as const;
    const normalized = slugify(body.slug || String(body.name ?? payload.name ?? existingName));
    if (!normalized) return { error: 'slug is required' } as const;
    payload.slug = normalized;
  }

  const description = normalizeOptionalString(body.description, 'description');
  if ('error' in description) return { error: description.error } as const;
  if ('value' in description) payload.description = description.value;

  const imageUrl = normalizeOptionalString(body.imageUrl, 'imageUrl');
  if ('error' in imageUrl) return { error: imageUrl.error } as const;
  if ('value' in imageUrl) payload.imageUrl = imageUrl.value;

  if (body.displayOrder !== undefined) {
    if (
      typeof body.displayOrder !== 'number' ||
      !Number.isInteger(body.displayOrder) ||
      body.displayOrder < 0
    ) {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    payload.displayOrder = body.displayOrder;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' } as const;
    }
    payload.isActive = body.isActive;
  }

  return { payload } as const;
}

export async function handleAdminBlogCategoryGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: AdminBlogCategoryByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const category = await deps.findCategoryDetailById(id);

  if (!category) {
    return { status: 404, body: { success: false, error: 'Blog category not found' } };
  }

  return { status: 200, body: { success: true, data: category } };
}

export async function handleAdminBlogCategoryPutRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogCategoryByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findCategoryById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Blog category not found' } };
  }

  const parsed = parseCategoryUpdatePayload(await request.json(), existing.name);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  if (parsed.payload.slug) {
    const duplicated = await deps.findCategoryBySlugExcludingId(parsed.payload.slug, id);
    if (duplicated) {
      return { status: 400, body: { success: false, error: 'Slug already exists' } };
    }
  }

  const category = await deps.updateCategoryById(id, parsed.payload);

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'PUT';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_category',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Updated blog category ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/categories/[id]',
      ),
    });
  }

  return { status: 200, body: { success: true, data: category } };
}

export async function handleAdminBlogCategoryDeleteRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogCategoryByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findCategoryById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Blog category not found' } };
  }

  const postCount = await deps.countPostsByCategoryId(id);
  if (postCount > 0) {
    return {
      status: 400,
      body: { success: false, error: `Cannot delete category with ${postCount} blog posts` },
    };
  }

  await deps.deleteCategoryById(id);

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'DELETE';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_category',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Deleted blog category ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/categories/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: { success: true, data: { message: 'Blog category deleted successfully' } },
  };
}

// GET /api/admin/blog/categories/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogCategoryGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin blog category detail error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PUT /api/admin/blog/categories/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogCategoryPutRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin update blog category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// DELETE /api/admin/blog/categories/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogCategoryDeleteRequest(_request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin delete blog category error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


