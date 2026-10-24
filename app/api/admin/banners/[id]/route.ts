import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapAuthErrorToStatus } from '@/lib/rbac';
import { requireAdmin } from '@/lib/session';
import {
  buildRequestCorrelation,
  writeAdminActionAuditLog,
} from '@/lib/admin-action-audit';

type AdminUser = {
  id: string;
  role: UserRole;
};

type BannerByIdDeps = {
  requireAdmin: () => Promise<AdminUser>;
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
  writeAdminAudit: writeAdminActionAuditLog,
};


function parseUpdatePayload(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Dữ liệu không hợp lệ' } as const;
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
      return { error: 'Thứ tự hiển thị phải là số nguyên không âm' } as const;
    }
    const displayOrder = body.displayOrder;
    if (!Number.isInteger(displayOrder) || displayOrder < 0) {
      return { error: 'Thứ tự hiển thị phải là số nguyên không âm' } as const;
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
      body: { success: false, error: 'Không tìm thấy banner' },
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
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findBannerById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy banner' },
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

  const headers =
    typeof (request as unknown as { headers?: Headers }).headers?.get === 'function'
      ? (request as unknown as { headers: Headers }).headers
      : new Headers();
  const method =
    typeof (request as unknown as { method?: string }).method === 'string'
      ? (request as unknown as { method: string }).method
      : 'PUT';
  if (deps.writeAdminAudit) {
    await deps.writeAdminAudit({
      module: 'content',
      entity: 'banner',
      entityId: id,
      mutationType: 'UPDATE',
      summary: `Cập nhật banner ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/banners/[id]',
      ),
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      data: banner,
    },
  };
}

export async function handleAdminBannerDeleteRequest(
  request: NextRequest,
  params: Promise<{ id: string }>,
  deps: BannerByIdDeps = defaultDeps,
): Promise<HandlerResult> {
  const admin = await deps.requireAdmin();
  const { id } = await params;
  const existing = await deps.findBannerById(id);

  if (!existing) {
    return {
      status: 404,
      body: { success: false, error: 'Không tìm thấy banner' },
    };
  }

  await deps.deleteBannerById(id);

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
      entity: 'banner',
      entityId: id,
      mutationType: 'DELETE',
      summary: `Xóa banner ${id}`,
      actorUserId: admin.id,
      actorRole: admin.role,
      correlation: buildRequestCorrelation(
        { headers, method },
        '/api/admin/banners/[id]',
      ),
    });
  }

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
      { success: false, error: message || 'Không tải được banner' },
      { status: mapAuthErrorToStatus(message) },
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
      { status: mapAuthErrorToStatus(message) },
    );
  }
}

// DELETE: Delete banner
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const result = await handleAdminBannerDeleteRequest(_request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Delete banner error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message || 'Failed to delete banner' },
      { status: mapAuthErrorToStatus(message) },
    );
  }
}


