import { NextRequest, NextResponse } from 'next/server';
import { releaseStaleCouponReservations } from '@/lib/incentives/redemption-lifecycle';
import {
  AuthError,
  mapAuthErrorToStatus,
  requireRequestToken,
} from '@/lib/rbac';

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

/**
 * Vercel Cron can only send `Authorization: Bearer $CRON_SECRET`, so the
 * scheduled run uses CRON_SECRET unless a dedicated token is configured.
 */
export function reconcileToken(env: {
  INCENTIVES_RECONCILE_TOKEN?: string;
  CRON_SECRET?: string;
}): string | null {
  return env.INCENTIVES_RECONCILE_TOKEN?.trim() || env.CRON_SECRET?.trim() || null;
}

const defaultDeps: ReconcileDeps = {
  getConfig: () => ({
    token: reconcileToken({
      INCENTIVES_RECONCILE_TOKEN: process.env.INCENTIVES_RECONCILE_TOKEN,
      CRON_SECRET: process.env.CRON_SECRET,
    }),
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
        error: 'Chưa cấu hình token đối soát',
      },
    };
  }

  try {
    requireRequestToken(request, config.token, {
      headerName: 'x-reconcile-token',
      allowBearer: true,
    });
  } catch (error) {
    const status = mapAuthErrorToStatus(error);
    const fallbackMessage = status === 401 ? 'Unauthorized' : 'Forbidden';

    if (error instanceof AuthError && error.code === 'TOKEN_NOT_CONFIGURED') {
      return {
        status: 503,
        body: {
          success: false,
          error: 'Chưa cấu hình token đối soát',
        },
      };
    }

    return {
      status,
      body: {
        success: false,
        error: fallbackMessage,
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
          error: 'Dữ liệu đối soát không hợp lệ',
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
        error: 'Không đối soát được mã ưu đãi',
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
        error: 'Không đối soát được mã ưu đãi',
      },
      { status: 500 },
    );
  }
}
