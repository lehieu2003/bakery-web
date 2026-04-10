import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/session';

type BannerByIdDeps = {
  requireAdmin: typeof requireAdmin;
  findBannerById: (id: string) => Promise<{
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    displayOrder: number;
    isActive: boolean;
  } | null>;
  updateBannerById: (
    id: string,
    payload: Partial<{
      title: string;
      description: string | null;
      imageUrl: string | null;
      linkUrl: string | null;
      displayOrder: number;
      isActive: boolean;
    }>,
  ) => Promise<unknown>;
  deleteBannerById: (id: string) => Promise<void>;
};

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

const defaultDeps: BannerByIdDeps = {
  requireAdmin,
  findBannerById: (id) =>
    prisma.banner.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        linkUrl: true,
        displayOrder: true,
        isActive: true,
      },
    }),
  updateBannerById: (id, payload) =>
    prisma.banner.update({
      where: { id },
      data: payload,
    }),
  deleteBannerById: async (id) => {
    await prisma.banner.delete({ where: { id } });
  },
};

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

function parseUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Invalid payload' } as const;
  }

  const body = raw as Record<string, unknown>;
  const payload: Partial<{
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    displayOrder: number;
    isActive: boolean;
  }> = {};

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { error: 'title must be a non-empty string' } as const;
    }
    payload.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      return { error: 'description must be a string' } as const;
    }
    payload.description =
      typeof body.description === 'string' ? body.description.trim() || null : null;
  }

  if (body.imageUrl !== undefined) {
    if (body.imageUrl !== null && typeof body.imageUrl !== 'string') {
      return { error: 'imageUrl must be a string' } as const;
    }
    payload.imageUrl =
      typeof body.imageUrl === 'string' ? body.imageUrl.trim() || null : null;
  }

  if (body.linkUrl !== undefined) {
    if (body.linkUrl !== null && typeof body.linkUrl !== 'string') {
      return { error: 'linkUrl must be a string' } as const;
    }
    payload.linkUrl =
      typeof body.linkUrl === 'string' ? body.linkUrl.trim() || null : null;
  }

  if (body.displayOrder !== undefined) {
    if (typeof body.displayOrder !== 'number') {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    const displayOrder = body.displayOrder;
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return { error: 'displayOrder must be a non-negative integer' } as const;
    }
    payload.displayOrder = displayOrder;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      return { error: 'isActive must be a boolean' } as const;
    }
    payload.isActive = body.isActive;
  }

  return { payload } as const;
}

export async function handleAdminBannerGetByIdRequest(
  params: Promise<{ id: string }>,
  deps: BannerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const banner = await deps.findBannerById(id);

  if (!banner) {
    return {
      status: 404,
      body: { success: false, error: 'Banner not found' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      data: banner,
    },
  };
}

export async function handleAdminBannerUpdateRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: BannerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findBannerById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Banner not found' },
    };
  }

  const parsed = parseUpdatePayload(await request.json());
  if ('error' in parsed) {
    return {
      status: 400,
      body: { success: false, error: parsed.error },
    };
  }

  const banner = await deps.updateBannerById(id, parsed.payload);
  return {
    status: 200,
    body: {
      success: true,
      data: banner,
    },
  };
}

export async function handleAdminBannerDeleteRequest(
  params: Promise<{ id: string }>,
  deps: BannerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findBannerById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Banner not found' },
    };
  }

  await deps.deleteBannerById(id);

  return {
    status: 200,
    body: {
      success: true,
      data: { message: 'Banner deleted successfully' },
    },
  };
}

// GET: Get banner by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminBannerGetByIdRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get banner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to fetch banner' },
      { status: mapErrorToStatus(message) },
    );
  }
}

// PUT: Update banner
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminBannerUpdateRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Update banner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to update banner' },
      { status: mapErrorToStatus(message) },
    );
  }
}

// DELETE: Delete banner
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminBannerDeleteRequest(params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Delete banner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to delete banner' },
      { status: mapErrorToStatus(message) },
    );
  }
}
