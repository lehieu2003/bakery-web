import { NextRequest, NextResponse } from 'next/server';
import { enforceIpRateLimit } from '@/lib/rate-limit';

type MerchImpressionPayload = {
  productId: string;
  slot: 'related' | 'best-seller' | 'personalized';
  surface: 'product-detail' | 'home';
  contextProductId?: string;
};

// Anonymous and written to stdout, so bound what one request can put there.
const MAX_ID_LENGTH = 64;
const MAX_BODY_BYTES = 4096;
const IMPRESSIONS_RATE_LIMIT = { maxRequests: 120, windowMs: 10 * 60 * 1000 };

function isProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && value.length <= MAX_ID_LENGTH;
}

function isValidPayload(value: unknown): value is MerchImpressionPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (!isProductId(record.productId)) return false;
  if (
    record.slot !== 'related' &&
    record.slot !== 'best-seller' &&
    record.slot !== 'personalized'
  ) {
    return false;
  }
  if (record.surface !== 'product-detail' && record.surface !== 'home') return false;
  if (record.contextProductId !== undefined && !isProductId(record.contextProductId)) {
    return false;
  }
  return true;
}

export async function handlePostMerchImpressionRequest(body: unknown) {
  if (!isValidPayload(body)) {
    return {
      status: 400,
      body: { success: false, error: 'Dữ liệu lượt xem không hợp lệ' },
    };
  }

  // MVP: make impressions trackable and observable via structured logs.
  // Only the known fields are logged, never the raw body.
  const impression: MerchImpressionPayload = {
    productId: body.productId,
    slot: body.slot,
    surface: body.surface,
    ...(body.contextProductId !== undefined
      ? { contextProductId: body.contextProductId }
      : {}),
  };
  console.info('merch_impression', impression);
  return { status: 200, body: { success: true } };
}

export async function POST(request: NextRequest) {
  const rateLimit = enforceIpRateLimit(request, 'merch-impressions', IMPRESSIONS_RATE_LIMIT);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { success: false, error: 'Quá nhiều yêu cầu' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } },
    );
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu lượt xem không hợp lệ' },
        { status: 413 },
      );
    }
    const result = await handlePostMerchImpressionRequest(JSON.parse(raw));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Post merch impression error:', error);
    return NextResponse.json(
      { success: false, error: 'Không ghi nhận được lượt xem' },
      { status: 500 },
    );
  }
}
