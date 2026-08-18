/**
 * VNPay Payment Integration
 * Docs: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 */

import crypto from 'crypto';

export const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || '',
  hashSecret: process.env.VNPAY_HASH_SECRET || '',
  url:
    process.env.VNPAY_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://vnpayment.vn/paymentv2/vpcpay.html'
      : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
};

export interface VNPayCreateParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  description: string;
  redirectUrl: string;
  ipAddr?: string;
  locale?: 'vn' | 'en';
}

export interface VNPayVerifyResult {
  isValid: boolean;
  orderId: string;
  amount: number;
  transactionId: string | null;
  responseCode: string;
  transactionStatus: string;
  isSuccess: boolean;
  bankCode?: string;
  cardType?: string;
  payDate?: string;
}

/**
 * Sorts object keys alphabetically and formats query string for VNPay checksum
 */
export function sortObject(
  obj: Record<string, string | number | undefined | null>,
): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
    .sort();

  for (const key of keys) {
    sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
  }

  return sorted;
}

/**
 * Formats a Date object to YYYYMMDDHHmmss string (in UTC+7 for VNPay)
 */
export function formatVNPayDate(date: Date = new Date()): string {
  // Use UTC+7 time
  const vnOffset = 7 * 60; // minutes
  const localTime = new Date(date.getTime() + (date.getTimezoneOffset() + vnOffset) * 60000);

  const year = localTime.getFullYear();
  const month = String(localTime.getMonth() + 1).padStart(2, '0');
  const day = String(localTime.getDate()).padStart(2, '0');
  const hours = String(localTime.getHours()).padStart(2, '0');
  const minutes = String(localTime.getMinutes()).padStart(2, '0');
  const seconds = String(localTime.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Creates VNPay payment URL
 */
export async function createVNPayPayment(
  params: VNPayCreateParams,
): Promise<{ payUrl: string } | { error: string }> {
  const { tmnCode, hashSecret, url } = VNPAY_CONFIG;

  if (!tmnCode || !hashSecret) {
    return { error: 'VNPay payment is not configured' };
  }

  const createDate = formatVNPayDate();
  const ipAddr = params.ipAddr?.trim() || '127.0.0.1';
  const amount = Math.round(params.amount * 100); // VNPay expects amount * 100

  const vnpParams: Record<string, string | number> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: params.locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.orderId,
    vnp_OrderInfo: params.description || `Thanh toán đơn hàng #${params.orderNumber}`,
    vnp_OrderType: 'other',
    vnp_Amount: amount,
    vnp_ReturnUrl: params.redirectUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnpParams);
  const signData = Object.entries(sortedParams)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');

  const hmac = crypto.createHmac('sha512', hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const paymentUrl = `${url}?${signData}&vnp_SecureHash=${signed}`;

  return { payUrl: paymentUrl };
}

/**
 * Verifies VNPay return or IPN query parameters
 */
export function verifyVNPayCallback(
  params: Record<string, unknown>,
): VNPayVerifyResult {
  const { hashSecret } = VNPAY_CONFIG;

  const secureHash = String(params.vnp_SecureHash || params.vnp_securehash || '').trim();
  const cleanParams: Record<string, string | number> = {};

  for (const [key, value] of Object.entries(params)) {
    if (
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      key !== 'vnp_securehash' &&
      key !== 'vnp_securehashtype' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      cleanParams[key] = String(value);
    }
  }

  const sortedParams = sortObject(cleanParams);
  const signData = Object.entries(sortedParams)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');

  let isValid = false;
  if (hashSecret && secureHash) {
    const hmac = crypto.createHmac('sha512', hashSecret);
    const expectedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash.length === expectedHash.length) {
      try {
        isValid = crypto.timingSafeEqual(
          Buffer.from(secureHash.toLowerCase()),
          Buffer.from(expectedHash.toLowerCase()),
        );
      } catch {
        isValid = false;
      }
    }
  }

  const orderId = String(params.vnp_TxnRef || '').trim();
  const rawAmount = Number(params.vnp_Amount);
  const amount = Number.isFinite(rawAmount) ? rawAmount / 100 : 0;
  const transactionId = String(params.vnp_TransactionNo || '').trim() || null;
  const responseCode = String(params.vnp_ResponseCode || '').trim();
  const transactionStatus = String(params.vnp_TransactionStatus || responseCode).trim();
  const isSuccess = responseCode === '00' && (transactionStatus === '00' || !transactionStatus);

  return {
    isValid,
    orderId,
    amount,
    transactionId,
    responseCode,
    transactionStatus,
    isSuccess,
    bankCode: params.vnp_BankCode ? String(params.vnp_BankCode) : undefined,
    cardType: params.vnp_CardType ? String(params.vnp_CardType) : undefined,
    payDate: params.vnp_PayDate ? String(params.vnp_PayDate) : undefined,
  };
}
