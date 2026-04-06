import { NextRequest, NextResponse } from 'next/server';
import { releaseStaleCouponReservations } from '@/lib/incentives/redemption-lifecycle';

type ReconcileConfig = {
  token: string | null;
  defaultOlderThanMinutes: number;
  defaultBatchSize: number;
};

type ReconcileDeps = {
  getConfig: () => ReconcileConfig;
  releaseStaleReservations: (args: {
    olderThanMinutes: number;
    batchSize: number;
  }) => Promise<{ scanned: number; released: number; threshold: Date }>;
};

const defaultDeps: ReconcileDeps = {
  getConfig: () => ({
    token: process.env.INCENTIVES_RECONCILE_TOKEN?.trim() || null,
    defaultOlderThanMinutes: Number.parseInt(
      process.env.INCENTIVES_RECONCILE_OLDER_THAN_MINUTES ?? '30',
      10,
    ),
    defaultBatchSize: Number.parseInt(
      process.env.INCENTIVES_RECONCILE_BATCH_SIZE ?? '100',
      10,
    ),
  }),
  releaseStaleReservations: ({ olderThanMinutes, batchSize }) =>
    releaseStaleCouponReservations({ olderThanMinutes, batchSize }),
};

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

function resolveToken(request: NextRequest): string | null {
  const headerToken = request.headers.get('x-reconcile-token')?.trim();
  if (headerToken) return headerToken;

  const authHeader = request.headers.get('authorization')?.trim() ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    return bearer || null;
  }

  return null;
}

async function parseBody(request: NextRequest): Promise<{
  olderThanMinutes: number | null;
  batchSize: number | null;
  invalid: boolean;
}> {
  try {
    const payload = (await request.json()) as {
      olderThanMinutes?: unknown;
      batchSize?: unknown;
    };

    const olderThanMinutes =
      typeof payload.olderThanMinutes === 'number'
        ? Number.isInteger(payload.olderThanMinutes) && payload.olderThanMinutes > 0
          ? payload.olderThanMinutes
          : null
        : payload.olderThanMinutes === undefined
          ? null
          : null;

    const batchSize =
      typeof payload.batchSize === 'number'
        ? Number.isInteger(payload.batchSize) && payload.batchSize > 0
          ? payload.batchSize
          : null
        : payload.batchSize === undefined
          ? null
          : null;

    const invalidOlder = payload.olderThanMinutes !== undefined && olderThanMinutes === null;
    const invalidBatch = payload.batchSize !== undefined && batchSize === null;

    return {
      olderThanMinutes,
      batchSize,
      invalid: invalidOlder || invalidBatch,
    };
  } catch {
    return { olderThanMinutes: null, batchSize: null, invalid: false };
  }
}

export async function handleIncentivesReconcileRequest(
  request: NextRequest,
  deps: ReconcileDeps = defaultDeps,
) {
  const config = deps.getConfig();
  if (!config.token) {
    return {
      status: 503,
      body: {
        success: false,
        error: 'Reconcile token is not configured',
      },
    };
  }

  const token = resolveToken(request);
  if (!token || token !== config.token) {
    return {
      status: 401,
      body: {
        success: false,
        error: 'Unauthorized',
      },
    };
  }

  const query = request.nextUrl.searchParams;
  let olderThanMinutes = parsePositiveInt(query.get('olderThanMinutes'));
  let batchSize = parsePositiveInt(query.get('batchSize'));

  if (request.method === 'POST') {
    const body = await parseBody(request);
    if (body.invalid) {
      return {
        status: 400,
        body: {
          success: false,
          error: 'Invalid reconciliation payload',
        },
      };
    }

    olderThanMinutes = body.olderThanMinutes ?? olderThanMinutes;
    batchSize = body.batchSize ?? batchSize;
  }

  const normalizedOlderThanMinutes =
    olderThanMinutes ??
    (Number.isFinite(config.defaultOlderThanMinutes) && config.defaultOlderThanMinutes > 0
      ? config.defaultOlderThanMinutes
      : 30);
  const normalizedBatchSize =
    batchSize ??
    (Number.isFinite(config.defaultBatchSize) && config.defaultBatchSize > 0
      ? config.defaultBatchSize
      : 100);

  const result = await deps.releaseStaleReservations({
    olderThanMinutes: normalizedOlderThanMinutes,
    batchSize: normalizedBatchSize,
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        scanned: result.scanned,
        released: result.released,
        threshold: result.threshold.toISOString(),
      },
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await handleIncentivesReconcileRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reconcile stale incentives error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reconcile stale incentives',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await handleIncentivesReconcileRequest(request, defaultDeps);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Reconcile stale incentives error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reconcile stale incentives',
      },
      { status: 500 },
    );
  }
}
