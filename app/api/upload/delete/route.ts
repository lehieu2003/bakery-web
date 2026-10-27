import { NextRequest, NextResponse } from 'next/server';

import { deleteFromCloudinary } from '@/lib/cloudinary';
import {
  mapAuthErrorToStatus,
  requirePolicyFromRequest,
  RBAC_POLICY_KEYS,
} from '@/lib/rbac';

type UploadDeleteDeps = {
  requireUploader: (request: NextRequest) => Promise<unknown>;
  deleteImage: typeof deleteFromCloudinary;
};

// Public IDs of storefront images are visible in their URLs, so deleting by
// public ID must stay with the admins who manage that imagery.
export const UPLOAD_DELETE_POLICY = RBAC_POLICY_KEYS.ADMIN_ONLY;

const defaultDeps: UploadDeleteDeps = {
  requireUploader: (request) =>
    requirePolicyFromRequest(request, UPLOAD_DELETE_POLICY),
  deleteImage: deleteFromCloudinary,
};

export async function handleUploadDeleteRequest(
  request: NextRequest,
  deps: UploadDeleteDeps = defaultDeps,
) {
  await deps.requireUploader(request);

  const body = await request.json();
  const { publicId } = body;

  if (!publicId) {
    return {
      status: 400,
      body: { success: false, error: 'Thiếu Public ID' },
    };
  }

  const result = await deps.deleteImage(publicId);
  if (!result.success) {
    return {
      status: 500,
      body: { success: false, error: result.error || 'Delete failed' },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      message: 'Image deleted successfully',
    },
  };
}

export async function handleUploadDeleteRouteRequest(
  request: NextRequest,
  deps: UploadDeleteDeps = defaultDeps,
) {
  try {
    return await handleUploadDeleteRequest(request, deps);
  } catch (error) {
    const status = mapAuthErrorToStatus(error);
    const message = error instanceof Error ? error.message : 'Delete failed';
    if (status === 500) {
      console.error('Delete API error:', error);
    }

    return {
      status,
      body: {
        success: false,
        error: status === 500 ? 'Delete failed' : message,
      },
    };
  }
}

// DELETE /api/upload/delete - Delete an image from Cloudinary
export async function DELETE(request: NextRequest) {
  const result = await handleUploadDeleteRouteRequest(request);
  return NextResponse.json(result.body, { status: result.status });
}
