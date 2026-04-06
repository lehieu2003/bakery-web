import { NextRequest, NextResponse } from 'next/server';

type MerchImpressionPayload = {
  productId: string;
  slot: 'related' | 'best-seller' | 'personalized';
  surface: 'product-detail' | 'home';
  contextProductId?: string;
};

function isValidPayload(value: unknown): value is MerchImpressionPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.productId !== 'string' || !record.productId.trim()) return false;
  if (
    record.slot !== 'related' &&
    record.slot !== 'best-seller' &&
    record.slot !== 'personalized'
  ) {
    return false;
  }
  if (record.surface !== 'product-detail' && record.surface !== 'home') return false;
  if (
    record.contextProductId !== undefined &&
    typeof record.contextProductId !== 'string'
  ) {
    return false;
  }
  return true;
}

export async function handlePostMerchImpressionRequest(body: unknown) {
  if (!isValidPayload(body)) {
    return {
      status: 400,
      body: { success: false, error: 'Invalid impression payload' },
    };
  }

  // MVP: make impressions trackable and observable via structured logs.
  console.info('merch_impression', body);
  return { status: 200, body: { success: true } };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await handlePostMerchImpressionRequest(body);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Post merch impression error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track merch impression' },
      { status: 500 },
    );
  }
}


