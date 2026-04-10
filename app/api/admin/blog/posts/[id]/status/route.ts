import { NextRequest, NextResponse } from 'next/server';
import type { BlogPostStatus, UserRole } from '@prisma/client';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

type AdminUser = {
  id: string;
  role: UserRole;
};

type AdminBlogPostStatusDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findPostById: (id: string) => Promise<{ id: string; publishedAt: Date | null } | null>;
  updatePostStatusById: (args: {
    id: string;
    status: BlogPostStatus;
    publishedAt: Date | null;
  }) => Promise<{ tags: Array<{ tag: unknown }>; [key: string]: unknown }>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const ALLOWED_STATUSES = new Set<BlogPostStatus>([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

const includeFields = {
  author: { select: { id: true, name: true } },
  category: true,
  tags: { include: { tag: true } },
};

const defaultDeps: AdminBlogPostStatusDeps = {
  requireAdmin,
  findPostById: (id) =>
    prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    }),
  updatePostStatusById: ({ id, status, publishedAt }) =>
    prisma.blogPost.update({
      where: { id },
      data: { status, publishedAt },
      include: includeFields,
    }),
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

export async function handleAdminBlogPostStatusPatchRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: AdminBlogPostStatusDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const statusRaw = (body as Record<string, unknown>).status;

  if (typeof statusRaw !== 'string' || !ALLOWED_STATUSES.has(statusRaw as BlogPostStatus)) {
    return { status: 400, body: { success: false, error: 'Invalid status' } };
  }

  const status = statusRaw as BlogPostStatus;
  const existing = await deps.findPostById(id);
  if (!existing) {
    return { status: 404, body: { success: false, error: 'Post not found' } };
  }

  const publishedAt =
    status === 'PUBLISHED'
      ? (existing.publishedAt ?? new Date())
      : null;

  const post = await deps.updatePostStatusById({ id, status, publishedAt });
  return {
    status: 200,
    body: {
      success: true,
      data: {
        ...post,
        tags: post.tags.map((t) => t.tag),
      },
    },
  };
}

// PATCH /api/admin/blog/posts/[id]/status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminBlogPostStatusPatchRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Admin update blog post status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
