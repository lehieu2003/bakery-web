import { NextRequest, NextResponse } from 'next/server';

import { handleAdminOrderPatchRequest } from '@/app/api/admin/orders/[id]/route';

type Params = { params: Promise<{ id: string }> };

type HandlerResult = {
  status: number;
  body: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
};

type StatusPatchDeps = {
  patchOrder: (
    request: Pick<NextRequest, 'json'>,
    params: Promise<{ id: string }>,
  ) => Promise<HandlerResult>;
};

const defaultDeps: StatusPatchDeps = {
  patchOrder: handleAdminOrderPatchRequest,
};

export async function handleAdminOrderStatusPatchRequest(
  request: Pick<NextRequest, 'json'>,
  params: Promise<{ id: string }>,
  deps: StatusPatchDeps = defaultDeps,
): Promise<HandlerResult> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return { status: 400, body: { success: false, error: 'Invalid JSON payload' } };
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return { status: 400, body: { success: false, error: 'Invalid payload' } };
  }

  const payload = rawBody as Record<string, unknown>;
  const keys = Object.keys(payload);
  if (keys.some((key) => key !== 'status')) {
    return {
      status: 400,
      body: { success: false, error: 'Only status can be updated via this endpoint' },
    };
  }

  return deps.patchOrder(
    {
      json: async () => ({ status: payload.status }),
    },
    params,
  );
}

function mapErrorToStatus(message: string) {
  if (message === 'Unauthorized') return 401;
  if (message === 'Forbidden: Admin access required') return 403;
  return 500;
}

// PATCH /api/admin/orders/[id]/status
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const result = await handleAdminOrderStatusPatchRequest(request, params);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error('Update order status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = mapErrorToStatus(message);
    return NextResponse.json(
      { success: false, error: status === 500 ? 'Internal server error' : message },
      { status },
    );
  }
}
