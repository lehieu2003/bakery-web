import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/pages/[slug] - Get page by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const page = await prisma.page.findUnique({
      where: { slug, isPublished: true },
    });

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error) {
    console.error('Get public page error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch page' },
      { status: 500 },
    );
  }
}
