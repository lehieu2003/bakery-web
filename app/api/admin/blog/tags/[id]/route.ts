import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
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

type BlogTagUpdatePayload = Partial<{
  name: string;
  slug: string;
}>;

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type AdminBlogTagByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findTagById: (id: string) => Promise<{ id: string; name: string } | null>;
  findTagDetailById: (id: string) => Promise<unknown | null>;
  findTagBySlugExcludingId: (slug: string, id: string) => Promise<{ id: string } | null>;
  updateTagById: (id: string, payload: BlogTagUpdatePayload) => Promise<unknown>;
  deleteTagRelationsByTagId: (id: string) => Promise<void>;
  deleteTagById: (id: string) => Promise<void>;
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

const defaultDeps: AdminBlogTagByIdDeps = {
  requireAdmin,
  findTagById: (id) =>
    prisma.blogTag.findUnique({
      where: { id },
      select: { id: true, name: true },
    }),
  findTagDetailById: (id) =>
    prisma.blogTag.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    }),
  findTagBySlugExcludingId: (slug, id) =>
    prisma.blogTag.findFirst({
      where: { slug, id: { not: id } },
      select: { id: true },
    }),
  updateTagById: (id, payload) =>
    prisma.blogTag.update({
      where: { id },
      data: payload,
      include: { _count: { select: { posts: true } } },
    }),
  deleteTagRelationsByTagId: async (id) => {
    await prisma.blogPostTag.deleteMany({ where: { tagId: id } });
  },
  deleteTagById: async (id) => {
    await prisma.blogTag.delete({ where: { id } });
  },
  writeAdminAudit: writeAdminActionAuditLog,
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function parseTagUpdatePayload(raw: unknown, existingName: string) {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid payload' } as const;
  const body = raw as Record<string, unknown>;
  const payload: BlogTagUpdatePayload = {};

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

  return { payload } as const;
}

export async function handleAdminBlogTagGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: AdminBlogTagByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const tag = await deps.findTagDetailById(id);

  if (!tag) {
    return { status: 404, body: { success: false, error: 'Blog tag not found' } };
  }
  return { status: 200, body: { success: true, data: tag } };
}

export async function handleAdminBlogTagPutRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogTagByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findTagById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Blog tag not found' } };
  }

  const parsed = parseTagUpdatePayload(await request.json(), existing.name);
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  if (parsed.payload.slug) {
    const duplicated = await deps.findTagBySlugExcludingId(parsed.payload.slug, id);
    if (duplicated) {
      return { status: 400, body: { success: false, error: 'Slug already exists' } };
    }
  }

  const tag = await deps.updateTagById(id, parsed.payload);

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
      entity: 'blog_tag',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Updated blog tag ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/tags/[id]',
      ),
    });
  }

  return { status: 200, body: { success: true, data: tag } };
}

export async function handleAdminBlogTagDeleteRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogTagByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findTagById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Blog tag not found' } };
  }

  await deps.deleteTagRelationsByTagId(id);
  await deps.deleteTagById(id);

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
      entity: 'blog_tag',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Deleted blog tag ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/tags/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Blog tag deleted successfully' },
    },
  };
}

// GET /api/admin/blog/tags/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogTagGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin blog tag detail error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// PUT /api/admin/blog/tags/[id]
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogTagPutRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin update blog tag error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// DELETE /api/admin/blog/tags/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogTagDeleteRequest(_request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin delete blog tag error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
