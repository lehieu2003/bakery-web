import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

type AdminUser = {
  id: string;
  role: UserRole;
};

type BannerCreatePayload = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  displayOrder: number;
  isActive: boolean;
};

type BannersRouteDeps = {
  requireAdmin: () => Promise<AdminUser>;
  findBanners: (activeOnly: boolean) => Promise<unknown[]>;
  createBanner: (payload: BannerCreatePayload) => Promise<unknown>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: BannersRouteDeps = {
  requireAdmin,
  findBanners: (activeOnly) =>
    prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    }),
  createBanner: (payload) =>
    prisma.banner.create({
      data: payload,
    }),
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function parseBannerCreatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const body = raw as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return { error: 'Title is required' } as const;
  }

  if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
    return { error: 'isActive must be a boolean' } as const;
  }

  const displayOrderRaw = body.displayOrder ?? 0;
  if (typeof displayOrderRaw !== 'number') {
    return { error: 'displayOrder must be a non-negative integer' } as const;
  }

  const displayOrder = displayOrderRaw;
  if (!Number.isInteger(displayOrder) || displayOrder < 0) {
    return { error: 'displayOrder must be a non-negative integer' } as const;
  }

  if (
    body.description !== undefined &&
    body.description !== null &&
    typeof body.description !== 'string'
  ) {
    return { error: 'description must be a string' } as const;
  }

  if (
    body.imageUrl !== undefined &&
    body.imageUrl !== null &&
    typeof body.imageUrl !== 'string'
  ) {
    return { error: 'imageUrl must be a string' } as const;
  }

  if (
    body.linkUrl !== undefined &&
    body.linkUrl !== null &&
    typeof body.linkUrl !== 'string'
  ) {
    return { error: 'linkUrl must be a string' } as const;
  }

  return {
    payload: {
      title,
      description:
        typeof body.description === 'string' ? body.description.trim() || null : null,
      imageUrl:
        typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : null,
      linkUrl:
        typeof body.linkUrl === 'string' ? body.linkUrl.trim() || null : null,
      displayOrder,
      isActive: body.isActive ?? true,
    } satisfies BannerCreatePayload,
  } as const;
}

export async function handleAdminBannersGetRequest(
  request: NextRequest,
  deps: BannersRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  const banners = await deps.findBanners(activeOnly);

  return {
    status: 200,
    body: {
      success: true,
      data: banners,
    },
  };
}

export async function handleAdminBannersPostRequest(
  request: NextRequest,
  deps: BannersRouteDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();

  const parsed = parseBannerCreatePayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const banner = await deps.createBanner(parsed.payload);
  return {
    status: 200,
    body: {
      success: true,
      data: banner,
    },
  };
}

// GET: List all banners
export async function GET(request: NextRequest) {
  try {
    const result = await handleAdminBannersGetRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get banners error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to fetch banners' },
      { status: mapErrorToStatus(message) },
    );
  }
}

// POST: Create new banner
export async function POST(request: NextRequest) {
  try {
    const result = await handleAdminBannersPostRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Create banner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to create banner' },
      { status: mapErrorToStatus(message) },
    );
  }
}
