import { NextRequest, NextResponse } from 'next/server';
import { expireUnpaidBankTransferOrders } from '@/lib/orders/expire-unpaid';
import { mapAuthErrorToStatus, requireRequestToken } from '@/lib/rbac';

type ExpireUnpaidConfig = {
  token: string | null;
  olderThanHours: number;
  batchSize: number;
};

type ExpireUnpaidRouteDeps = {
  getConfig: () => ExpireUnpaidConfig;
  expire: (args: {
    olderThanHours: number;
    batchSize: number;
  }) => Promise<{ scanned: number; cancelled: number; threshold: Date }>;
};

function positiveIntOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const defaultDeps: ExpireUnpaidRouteDeps = {
  getConfig: () => ({
    token: process.env.CRON_SECRET?.trim() || null,
    olderThanHours: positiveIntOr(process.env.UNPAID_BANK_TRANSFER_TTL_HOURS, 24),
    batchSize: 100,
  }),
  expire: (args) => expireUnpaidBankTransferOrders(args),
};

export async function handleExpireUnpaidOrdersRequest(
  request: NextRequest,
  deps: ExpireUnpaidRouteDeps = defaultDeps,
) {
  const config = deps.getConfig();

  try {
    // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
    requireRequestToken(request, config.token, {
      headerName: 'x-cron-token',
      allowBearer: true,
    });
  } catch (error) {
    const status = mapAuthErrorToStatus(error);
    return {
      status,
      body: {
        success: false,
        error: status === 503 ? 'Chưa cấu hình CRON_SECRET' : status === 401 ? 'Unauthorized' : 'Forbidden',
      },
    };
  }

  const result = await deps.expire({
    olderThanHours: config.olderThanHours,
    batchSize: config.batchSize,
  });

  return {
    status: 200,
    body: {
      success: true,
      data: {
        scanned: result.scanned,
        cancelled: result.cancelled,
        threshold: result.threshold.toISOString(),
      },
    },
  };
}

// GET /api/cron/expire-unpaid-orders — called by Vercel Cron
export async function GET(request: NextRequest) {
  try {
    const result = await handleExpireUnpaidOrdersRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Expire unpaid orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Không hủy được đơn chưa thanh toán' },
      { status: 500 },
    );
  }
}
