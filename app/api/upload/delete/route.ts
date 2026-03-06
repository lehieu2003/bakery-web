import { NextRequest, NextResponse } from 'next/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';
import { getSession } from '@/lib/session';

// DELETE /api/upload/delete - Delete an image from Cloudinary
export async function DELETE(request: NextRequest) {
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
    const { publicId } = body;

    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'Public ID is required' },
        { status: 400 },
      );
    }

    const result = await deleteFromCloudinary(publicId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Delete failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      },
      { status: 500 },
    );
  }
}
