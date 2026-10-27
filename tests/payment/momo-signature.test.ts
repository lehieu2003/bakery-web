import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyMoMoCallback } from '@/lib/payment/momo';

// What an attacker can compute when the server has no MOMO_SECRET_KEY: the
// raw string is public and an empty-key HMAC is deterministic.
function forgeWithEmptyKey(params: Record<string, string>) {
  const raw = [
    `accessKey=${process.env.MOMO_ACCESS_KEY ?? ''}`,
    `amount=${params.amount}`,
    `extraData=${params.extraData}`,
    `message=${params.message}`,
    `orderId=${params.orderId}`,
    `orderInfo=${params.orderInfo}`,
    `orderType=${params.orderType}`,
    `partnerCode=${params.partnerCode}`,
    `payType=${params.payType}`,
    `requestId=${params.requestId}`,
    `responseTime=${params.responseTime}`,
    `resultCode=${params.resultCode}`,
    `transId=${params.transId}`,
  ].join('&');
  return crypto.createHmac('sha256', '').update(raw).digest('hex');
}

test('without a configured secret, a forged "paid" callback is rejected', () => {
  assert.equal(process.env.MOMO_SECRET_KEY ?? '', '', 'test assumes no MoMo secret');

  const params = {
    amount: '100000',
    extraData: '',
    message: 'Successful.',
    orderId: 'BK261027ABCD',
    orderInfo: 'Thanh toán đơn hàng',
    orderType: 'momo_wallet',
    partnerCode: 'MOMO',
    payType: 'qr',
    requestId: 'req-1',
    responseTime: '1761550000000',
    resultCode: '0',
    transId: '4000000001',
  };

  assert.equal(
    verifyMoMoCallback({ ...params, signature: forgeWithEmptyKey(params) }),
    false,
  );
});
