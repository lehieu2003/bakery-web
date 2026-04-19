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

type AdminUser = {
  id: string;
  role: UserRole;
};

type BlogTagPayload = {
  name: string;
  slug: string;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type AdminBlogTagsDeps = {
  requireAdmin: () => Promise<AdminUser>;
  listTags: () => Promise<unknown[]>;
  findTagBySlug: (slug: string) => Promise<{ id: string } | null>;
  createTag: (payload: BlogTagPayload) => Promise<unknown>;
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

const defaultDeps: AdminBlogTagsDeps = {
  requireAdmin,
  listTags: () =>
    prisma.blogTag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { name: 'asc' },
    }),
  findTagBySlug: (slug) =>
    prisma.blogTag.findUnique({
      where: { slug },
      select: { id: true },
    }),
  createTag: (payload) =>
    prisma.blogTag.create({
      data: payload,
      include: { _count: { select: { posts: true } } },
    }),
  writeAdminAudit: writeAdminActionAuditLog,
};


function parseTagPayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { error: 'Invalid payload' } as const;
  const body = raw as Record<string, unknown>;

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'name is required' } as const;

  const slug = slugify((typeof body.slug === 'string' ? body.slug : name) || '');
  if (!slug) return { error: 'slug is required' } as const;

  return { payload: { name, slug } satisfies BlogTagPayload } as const;
}

export async function handleAdminBlogTagsGetRequest(
  deps: AdminBlogTagsDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const tags = await deps.listTags();
  return { status: 200, body: { success: true, data: { tags } } };
}

export async function handleAdminBlogTagsPostRequest(
  request: NextRequest,
  deps: AdminBlogTagsDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const parsed = parseTagPayload(await request.json());
  if ('error' in parsed) {
    return { status: 400, body: { success: false, error: parsed.error } };
  }

  const existing = await deps.findTagBySlug(parsed.payload.slug);
  if (existing) {
    return { status: 400, body: { success: false, error: 'Slug already exists' } };
  }

  const tag = await deps.createTag(parsed.payload);

  if (deps.writeAdminAudit) {
    const headers =
      typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
        ? (request as unknown as { headers: Headers }).headers
        : new Headers();
    const method =
      typeof (request as unknown as { method?: string }).method === 'string'
        ? (request as unknown as { method: string }).method
        : 'POST';
    const tagId =
      typeof (tag as { id?: unknown }).id === 'string'
        ? (tag as { id: string }).id
        : 'unknown';
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'blog_tag',
      entityId: tagId,
      mutationType: 'CREATE',
      summary: `Created blog tag ${parsed.payload.name}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/blog/tags',
      ),
    });
  }

  return { status: 200, body: { success: true, data: tag } };
}

// GET /api/admin/blog/tags
export async function GET() {
  try {
    const result = await handleAdminBlogTagsGetRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin blog tags list error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}

// POST /api/admin/blog/tags
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminBlogTagsPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin create blog tag error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapAuthErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}


