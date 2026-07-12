/**
 * ZaloPay Payment Integration
 * Docs: https://docs.zalopay.vn/v2/general/overview.html
 */

import crypto from 'crypto';

const ZALOPAY_CONFIG = {
  appId: Number(process.env.ZALOPAY_APP_ID) || 0,
  key1: process.env.ZALOPAY_KEY1 || '',
  key2: process.env.ZALOPAY_KEY2 || '',
  endpoint:
    process.env.NODE_ENV === 'production'
      ? 'https://openapi.zalopay.vn/v2/create'
      : 'https://sb-openapi.zalopay.vn/v2/create',
};

interface ZaloPayCreateParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  description: string;
  redirectUrl: string;
  callbackUrl: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

interface ZaloPayCreateResponse {
  return_code: number; // 1 = success
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  order_url: string;
  zp_trans_token: string;
  order_token: string;
}

function createZaloPayMac(data: string): string {
  return crypto
    .createHmac('sha256', ZALOPAY_CONFIG.key1)
    .update(data)
    .digest('hex');
}

export function verifyZaloPayCallback(
  dataStr: string,
  reqMac: string,
): boolean {
  const mac = crypto
    .createHmac('sha256', ZALOPAY_CONFIG.key2)
    .update(dataStr)
    .digest('hex');

  if (reqMac.length !== mac.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(reqMac), Buffer.from(mac));
}

export async function createZaloPayPayment(
  params: ZaloPayCreateParams,
): Promise<{ payUrl: string } | { error: string }> {
  const { appId, key1 } = ZALOPAY_CONFIG;

  if (!appId || !key1) {
    return { error: 'ZaloPay payment is not configured' };
  }

  const now = new Date();
  const yyMMdd = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const appTransId = `${yyMMdd}_${params.orderId}`;
  const appTime = Date.now();
  const appUser = 'bakery_customer';

  const embedData = JSON.stringify({
    redirecturl: params.redirectUrl,
    orderNumber: params.orderNumber,
  });
  const itemStr = JSON.stringify(params.items);

  // mac = HMAC(key1, app_id|app_trans_id|app_user|amount|app_time|embed_data|item)
  const macData = [
    appId,
    appTransId,
    appUser,
    params.amount,
    appTime,
    embedData,
    itemStr,
  ].join('|');
  const mac = createZaloPayMac(macData);

  const body = {
    app_id: appId,
    app_user: appUser,
    app_time: appTime,
    amount: params.amount,
    app_trans_id: appTransId,
    embed_data: embedData,
    item: itemStr,
    description: params.description,
    bank_code: '',
    mac,
    callback_url: params.callbackUrl,
  };

  const response = await fetch(ZALOPAY_CONFIG.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: ZaloPayCreateResponse = await response.json();

  if (data.return_code === 1 && data.order_url) {
    return { payUrl: data.order_url };
  }

  return {
    error:
      data.sub_return_message ||
      data.return_message ||
      'ZaloPay payment creation failed',
  };
}
