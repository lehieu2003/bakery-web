'use client';

type MerchImpressionPayload = {
  productId: string;
  slot: 'related' | 'best-seller' | 'personalized';
  surface: 'product-detail' | 'home';
  contextProductId?: string;
};

const seenImpressions = new Set<string>();

function makeKey(payload: MerchImpressionPayload) {
  return `${payload.surface}:${payload.slot}:${payload.contextProductId ?? '-'}:${payload.productId}`;
}

export async function trackMerchImpression(payload: MerchImpressionPayload) {
  if (!payload.productId) return;

  const key = makeKey(payload);
  if (seenImpressions.has(key)) return;
  seenImpressions.add(key);

  try {
    await fetch('/api/public/merch-impressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Intentionally ignore analytics failures to avoid impacting UX.
  }
}
