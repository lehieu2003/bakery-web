import { NextRequest, NextResponse } from 'next/server';

import { uploadMultipleToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import {
  mapAuthErrorToStatus,
  requirePolicyFromRequest,
  RBAC_POLICY_KEYS,
} from '@/lib/rbac';

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
  const { file, files, folder } = body;

  if (!file && (!files || files.length === 0)) {
    return {
      status: 400,
      body: { success: false, error: 'No file(s) provided' },
    };
  }

  if (file) {
    const result = await deps.uploadOne(file, folder || 'bakery-shop');
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

  if (files && files.length > 0) {
    const results = await deps.uploadMany(files, folder || 'bakery-shop');
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
    body: { success: false, error: 'Invalid request' },
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
