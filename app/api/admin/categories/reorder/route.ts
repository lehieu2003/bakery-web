import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// PATCH: Bulk reorder categories by updating displayOrder for each
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const items: { id: string; displayOrder: number }[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'items array is required' },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        prisma.category.update({
          where: { id },
          data: { displayOrder },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder categories' },
      { status: 500 },
    );
  }
}
