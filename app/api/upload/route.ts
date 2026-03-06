import { NextRequest, NextResponse } from 'next/server';
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
} from '@/lib/cloudinary';
import { getSession } from '@/lib/session';

// POST /api/upload - Upload single or multiple images
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { file, files, folder } = body;

    // Validate input
    if (!file && (!files || files.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'No file(s) provided' },
        { status: 400 },
      );
    }

    // Handle single file upload
    if (file) {
      const result = await uploadToCloudinary(file, folder || 'bakery-shop');

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Upload failed' },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          url: result.url,
          publicId: result.publicId,
        },
      });
    }

    // Handle multiple files upload
    if (files && files.length > 0) {
      const results = await uploadMultipleToCloudinary(
        files,
        folder || 'bakery-shop',
      );

      const successResults = results.filter((r) => r.success);
      const failedResults = results.filter((r) => !r.success);

      return NextResponse.json({
        success: successResults.length > 0,
        data: {
          uploaded: successResults.map((r) => ({
            url: r.url,
            publicId: r.publicId,
          })),
          failed: failedResults.length,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}
