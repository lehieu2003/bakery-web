import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/pages - List published pages
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: pages,
    });
  } catch (error) {
    console.error('Get public pages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 },
    );
  }
}
