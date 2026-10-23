/**
 * MoMo Payment Integration
 * Docs: https://developers.momo.vn/v3/docs/payment/api/wallet/onetime
 */

import crypto from 'crypto';

const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || '',
  accessKey: process.env.MOMO_ACCESS_KEY || '',
  secretKey: process.env.MOMO_SECRET_KEY || '',
  endpoint:
    process.env.NODE_ENV === 'production'
      ? 'https://payment.momo.vn/v2/gateway/api/create'
      : 'https://test-payment.momo.vn/v2/gateway/api/create',
};

/** The checkout request waits on this call, so it must not hang. */
const MOMO_CREATE_TIMEOUT_MS = 15_000;

interface MoMoCreatePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
}

interface MoMoCreatePaymentResponse {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl: string;
  shortLink: string;
}

export function createMoMoSignature(rawData: string): string {
  return crypto
    .createHmac('sha256', MOMO_CONFIG.secretKey)
    .update(rawData)
    .digest('hex');
}

export function verifyMoMoCallback(params: Record<string, string>): boolean {
  const { signature, ...rest } = params;

  // MoMo callback signature fields (sorted alphabetically)
  const rawSignature = [
    `accessKey=${MOMO_CONFIG.accessKey}`,
    `amount=${rest.amount}`,
    `extraData=${rest.extraData}`,
    `message=${rest.message}`,
    `orderId=${rest.orderId}`,
    `orderInfo=${rest.orderInfo}`,
    `orderType=${rest.orderType}`,
    `partnerCode=${rest.partnerCode}`,
    `payType=${rest.payType}`,
    `requestId=${rest.requestId}`,
    `responseTime=${rest.responseTime}`,
    `resultCode=${rest.resultCode}`,
    `transId=${rest.transId}`,
  ].join('&');

  const expectedSignature = createMoMoSignature(rawSignature);
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function createMoMoPayment(
  params: MoMoCreatePaymentParams,
): Promise<{ payUrl: string } | { error: string }> {
  const { partnerCode, accessKey, secretKey } = MOMO_CONFIG;

  if (!partnerCode || !accessKey || !secretKey) {
    return { error: 'MoMo payment is not configured' };
  }

  const requestId = `${params.orderId}_${Date.now()}`;
  const extraData = JSON.stringify({ orderNumber: params.orderNumber });
  const extraDataBase64 = Buffer.from(extraData).toString('base64');
  const requestType = 'payWithMethod';

  // Build signature (fields must be alphabetical)
  const rawSignature = [
    `accessKey=${accessKey}`,
    `amount=${params.amount}`,
    `extraData=${extraDataBase64}`,
    `ipnUrl=${params.ipnUrl}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `partnerCode=${partnerCode}`,
    `redirectUrl=${params.redirectUrl}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = createMoMoSignature(rawSignature);

  const body = {
    partnerCode,
    requestId,
    amount: params.amount,
    orderId: params.orderId,
    orderInfo: params.orderInfo,
    redirectUrl: params.redirectUrl,
    ipnUrl: params.ipnUrl,
    requestType,
    extraData: extraDataBase64,
    lang: 'vi',
    signature,
  };

  const response = await fetch(MOMO_CONFIG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(MOMO_CREATE_TIMEOUT_MS),
  });

  const data: MoMoCreatePaymentResponse = await response.json();

  if (data.resultCode === 0 && data.payUrl) {
    return { payUrl: data.payUrl };
  }

  return { error: data.message || 'MoMo payment creation failed' };
}
