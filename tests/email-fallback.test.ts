import assert from 'node:assert/strict';
import test from 'node:test';

import { EmailService, logEmailWithoutTransport } from '@/lib/email';

function captureConsole<T>(run: () => T): { result: T; output: string } {
  const lines: string[] = [];
  const original = { log: console.log, error: console.error };
  console.log = (...args: unknown[]) => lines.push(args.join(' '));
  console.error = (...args: unknown[]) => lines.push(args.join(' '));
  try {
    return { result: run(), output: lines.join('\n') };
  } finally {
    console.log = original.log;
    console.error = original.error;
  }
}

test('without a mail transport, production reports failure and never logs the body', () => {
  const { result, output } = captureConsole(() =>
    logEmailWithoutTransport('EMAIL', 'lan@example.com', 'OTP', 'Mã OTP: 482913', true),
  );

  assert.equal(result, false);
  assert.equal(output.includes('482913'), false);
});

test('without a mail transport, development prints the email', () => {
  const { result, output } = captureConsole(() =>
    logEmailWithoutTransport('EMAIL', 'lan@example.com', 'OTP', 'Mã OTP: 482913', false),
  );

  assert.equal(result, true);
  assert.equal(output.includes('482913'), true);
});

test('sendOtp throws when the email was not delivered', async () => {
  const service = new EmailService({ sendEmail: async () => false });

  await assert.rejects(service.sendOtp('lan@example.com', '482913'));
});

test('sendOtp resolves when the email was delivered', async () => {
  const service = new EmailService({ sendEmail: async () => true });

  assert.equal(await service.sendOtp('lan@example.com', '482913'), true);
});
