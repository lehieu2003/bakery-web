import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: List all banners
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const where: Record<string, unknown> = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error('Get banners error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch banners' },
      { status: 500 },
    );
  }
}

// POST: Create new banner
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { title, description, imageUrl, linkUrl, displayOrder, isActive } =
      body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 },
      );
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        displayOrder: displayOrder || 0,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: banner,
    });
  } catch (error) {
    console.error('Create banner error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create banner' },
      { status: 500 },
    );
  }
}
