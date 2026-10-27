import test from 'node:test';
import assert from 'node:assert/strict';
import type { NextRequest } from 'next/server';
import { CLOUDINARY_IMAGE_UPLOAD_OPTIONS } from '@/lib/cloudinary';

test('cloudinary stores every upload as an image', () => {
  assert.equal(CLOUDINARY_IMAGE_UPLOAD_OPTIONS.resource_type, 'image');
});

import {
  handleUploadRequest,
  validateUploadPayload,
} from '@/app/api/upload/route';

const VALID_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeRequest(body: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}

function recordingDeps() {
  const uploadedOne: Array<{ file: string; folder: string }> = [];
  const uploadedMany: Array<{ files: string[]; folder: string }> = [];

  const deps = {
    requireUploader: async () => null,
    uploadOne: async (file: string, folder = '') => {
      uploadedOne.push({ file, folder });
      return {
        success: true,
        url: 'https://cdn.example.com/one.png',
        publicId: 'bakery-shop/one',
      };
    },
    uploadMany: async (files: string[], folder = '') => {
      uploadedMany.push({ files, folder });
      return files.map((_, index) => ({
        success: true,
        url: `https://cdn.example.com/${index}.png`,
        publicId: `bakery-shop/${index}`,
      }));
    },
  };

  return { deps, uploadedOne, uploadedMany };
}

test('rejects non-image data urls (text/plain)', async () => {
  const textDataUrl = 'data:text/plain;base64,SGVsbG8gYmFrZXJ5';

  const validation = validateUploadPayload({ file: textDataUrl });
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.match(validation.error, /image/i);
  }

  const { deps, uploadedOne, uploadedMany } = recordingDeps();
  const result = await handleUploadRequest(makeRequest({ file: textDataUrl }), deps);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(uploadedOne.length, 0);
  assert.equal(uploadedMany.length, 0);
});

test('rejects image types outside the allowlist (gif)', () => {
  const gifDataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const validation = validateUploadPayload({ file: gifDataUrl });
  assert.equal(validation.ok, false);
});

test('rejects base64 images larger than 5MB', async () => {
  const oversized = `data:image/png;base64,${'A'.repeat(7_000_000)}`;

  const validation = validateUploadPayload({ file: oversized });
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.match(validation.error, /5MB/);
  }

  const { deps, uploadedOne } = recordingDeps();
  const result = await handleUploadRequest(makeRequest({ file: oversized }), deps);
  assert.equal(result.status, 400);
  assert.equal(uploadedOne.length, 0);
});

test('enforces the 5MB limit using decoded size (base64 length x 3/4)', () => {
  // 6_990_504 base64 chars -> 5_242_878 decoded bytes, just under 5MB (5_242_880)
  const justUnder = `data:image/jpeg;base64,${'A'.repeat(6_990_504)}`;
  assert.deepEqual(validateUploadPayload({ file: justUnder }), {
    ok: true,
    files: [justUnder],
  });

  // 6_990_508 base64 chars -> 5_242_881 decoded bytes, just over 5MB
  const justOver = `data:image/jpeg;base64,${'A'.repeat(6_990_508)}`;
  const validation = validateUploadPayload({ file: justOver });
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.match(validation.error, /5MB/);
  }
});

test('rejects more than 5 files in one request', async () => {
  const sixFiles = Array.from({ length: 6 }, () => VALID_PNG_DATA_URL);

  const validation = validateUploadPayload({ files: sixFiles });
  assert.equal(validation.ok, false);
  if (!validation.ok) {
    assert.match(validation.error, /5/);
  }

  const { deps, uploadedMany } = recordingDeps();
  const result = await handleUploadRequest(makeRequest({ files: sixFiles }), deps);
  assert.equal(result.status, 400);
  assert.equal(uploadedMany.length, 0);
});

test('accepts a single valid png data url and uploads it', async () => {
  const validation = validateUploadPayload({ file: VALID_PNG_DATA_URL });
  assert.deepEqual(validation, { ok: true, files: [VALID_PNG_DATA_URL] });

  const { deps, uploadedOne, uploadedMany } = recordingDeps();
  const result = await handleUploadRequest(makeRequest({ file: VALID_PNG_DATA_URL }), deps);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(result.body.data);
  assert.equal(result.body.data.url, 'https://cdn.example.com/one.png');
  assert.equal(result.body.data.publicId, 'bakery-shop/one');
  assert.deepEqual(uploadedOne, [{ file: VALID_PNG_DATA_URL, folder: 'bakery-shop' }]);
  assert.equal(uploadedMany.length, 0);
});

test('ignores client-provided folder and always uploads into bakery-shop', async () => {
  const validation = validateUploadPayload({ file: VALID_PNG_DATA_URL, folder: 'hacker' });
  assert.equal(validation.ok, true);

  const single = recordingDeps();
  const singleResult = await handleUploadRequest(
    makeRequest({ file: VALID_PNG_DATA_URL, folder: 'hacker' }),
    single.deps,
  );
  assert.equal(singleResult.status, 200);
  assert.deepEqual(single.uploadedOne, [
    { file: VALID_PNG_DATA_URL, folder: 'bakery-shop' },
  ]);

  const multiple = recordingDeps();
  const multiFiles = [VALID_PNG_DATA_URL, VALID_PNG_DATA_URL];
  const multiResult = await handleUploadRequest(
    makeRequest({ files: multiFiles, folder: 'hacker' }),
    multiple.deps,
  );
  assert.equal(multiResult.status, 200);
  assert.equal(multiResult.body.success, true);
  assert.deepEqual(multiple.uploadedMany, [{ files: multiFiles, folder: 'bakery-shop' }]);
});

test('auth gate runs before validation and upload', async () => {
  const { deps, uploadedOne } = recordingDeps();
  let authCalls = 0;

  await assert.rejects(
    handleUploadRequest(makeRequest({ file: VALID_PNG_DATA_URL }), {
      ...deps,
      requireUploader: async () => {
        authCalls += 1;
        throw new Error('not authorized');
      },
    }),
    /not authorized/,
  );

  assert.equal(authCalls, 1);
  assert.equal(uploadedOne.length, 0);
});

test('returns 400 when no file(s) are provided', async () => {
  const validation = validateUploadPayload({});
  assert.equal(validation.ok, false);

  const { deps, uploadedOne, uploadedMany } = recordingDeps();
  const result = await handleUploadRequest(makeRequest({}), deps);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(uploadedOne.length, 0);
  assert.equal(uploadedMany.length, 0);
});
