import { NextRequest, NextResponse } from 'next/server';

import { uploadMultipleToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import {
  mapAuthErrorToStatus,
  requirePolicyFromRequest,
  RBAC_POLICY_KEYS,
} from '@/lib/rbac';

const UPLOAD_FOLDER = 'bakery-shop';
const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024; // 5MB decoded
const MAX_UPLOAD_FILES = 5;
const UPLOAD_DATA_URL_PATTERN =
  /^data:image\/(png|jpe?g|webp|avif|heic);base64,[A-Za-z0-9+/=]+$/;

type UploadPayloadValidationResult =
  | { ok: true; files: string[] }
  | { ok: false; error: string };

/**
 * Validate the upload request body before any upload call.
 * - Every file must be a base64 image data URL (png, jpeg, webp, avif, heic)
 * - Decoded size per file must be at most 5MB (base64 length x 3/4)
 * - At most 5 files per request
 * - The client-provided `folder` is ignored; uploads always go to UPLOAD_FOLDER
 */
export function validateUploadPayload(
  body: unknown,
): UploadPayloadValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Dữ liệu yêu cầu không hợp lệ' };
  }

  const { file, files } = body as { file?: unknown; files?: unknown };

  let candidates: unknown[];
  if (file !== undefined && file !== null) {
    candidates = [file];
  } else if (Array.isArray(files) && files.length > 0) {
    candidates = files;
  } else {
    return { ok: false, error: 'Chưa chọn file nào' };
  }

  if (candidates.length > MAX_UPLOAD_FILES) {
    return {
      ok: false,
      error: `Too many files. Maximum is ${MAX_UPLOAD_FILES} files per request`,
    };
  }

  for (const candidate of candidates) {
    if (
      typeof candidate !== 'string' ||
      !UPLOAD_DATA_URL_PATTERN.test(candidate)
    ) {
      return {
        ok: false,
        error:
          'Invalid file. Only base64 image data URLs (png, jpeg, webp, avif, heic) are allowed',
      };
    }

    const base64Payload = candidate.slice(candidate.indexOf(',') + 1);
    const decodedBytes = (base64Payload.length * 3) / 4;
    if (decodedBytes > MAX_UPLOAD_FILE_BYTES) {
      return {
        ok: false,
        error: 'File quá lớn. Tối đa 5MB mỗi file',
      };
    }
  }

  return { ok: true, files: candidates as string[] };
}

type UploadDeps = {
  requireUploader: (request: NextRequest) => Promise<unknown>;
  uploadOne: typeof uploadToCloudinary;
  uploadMany: typeof uploadMultipleToCloudinary;
};

const defaultDeps: UploadDeps = {
  requireUploader: (request) =>
    requirePolicyFromRequest(request, RBAC_POLICY_KEYS.AUTHENTICATED_USER),
  uploadOne: uploadToCloudinary,
  uploadMany: uploadMultipleToCloudinary,
};

export async function handleUploadRequest(
  request: NextRequest,
  deps: UploadDeps = defaultDeps,
) {
  await deps.requireUploader(request);

  const body = await request.json();
  const validated = validateUploadPayload(body);

  if (!validated.ok) {
    return {
      status: 400,
      body: { success: false, error: validated.error },
    };
  }

  const { file } = body as { file?: unknown };

  if (file !== undefined && file !== null) {
    const result = await deps.uploadOne(validated.files[0], UPLOAD_FOLDER);
    if (!result.success) {
      return {
        status: 500,
        body: { success: false, error: result.error || 'Upload failed' },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
        },
      },
    };
  }

  if (validated.files.length > 0) {
    const results = await deps.uploadMany(validated.files, UPLOAD_FOLDER);
    const successResults = results.filter((result) => result.success);
    const failedResults = results.filter((result) => !result.success);

    return {
      status: 200,
      body: {
        success: successResults.length > 0,
        data: {
          uploaded: successResults.map((result) => ({
            url: result.url,
            publicId: result.publicId,
          })),
          failed: failedResults.length,
        },
      },
    };
  }

  return {
    status: 400,
    body: { success: false, error: 'Yêu cầu không hợp lệ' },
  };
}

export async function handleUploadPostRequest(
  request: NextRequest,
  deps: UploadDeps = defaultDeps,
) {
  try {
    return await handleUploadRequest(request, deps);
  } catch (error) {
    const status = mapAuthErrorToStatus(error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    if (status === 500) {
      console.error('Upload API error:', error);
    }

    return {
      status,
      body: {
        success: false,
        error: status === 500 ? 'Upload failed' : message,
      },
    };
  }
}

// POST /api/upload - Upload single or multiple images
export async function POST(request: NextRequest) {
  const result = await handleUploadPostRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}
