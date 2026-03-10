import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: Get category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 },
    );
  }
}

// PUT: Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 },
      );
    }

    // Check slug uniqueness if changed
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: body.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug already exists' },
          { status: 400 },
        );
      }
    }

    // Prevent setting self as parent (circular ref)
    if (body.parentId && body.parentId === id) {
      return NextResponse.json(
        { success: false, error: 'A category cannot be its own parent' },
        { status: 400 },
      );
    }

    // Prevent setting a child/descendant as parent (circular ref)
    if (body.parentId) {
      const getAllDescendantIds = async (catId: string): Promise<string[]> => {
        const children = await prisma.category.findMany({
          where: { parentId: catId },
          select: { id: true },
        });
        const ids = children.map((c) => c.id);
        for (const child of children) {
          ids.push(...(await getAllDescendantIds(child.id)));
        }
        return ids;
      };
      const descendantIds = await getAllDescendantIds(id);
      if (descendantIds.includes(body.parentId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot set a descendant category as parent',
          },
          { status: 400 },
        );
      }
    }

    // Auto-calculate level from parent
    let newLevel: number | undefined;
    if (body.parentId !== undefined) {
      if (body.parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: body.parentId },
          select: { level: true },
        });
        newLevel = parent ? parent.level + 1 : 1;
      } else {
        newLevel = 1;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        imageUrl: body.imageUrl,
        parentId:
          body.parentId !== undefined ? body.parentId || null : undefined,
        level: newLevel,
        displayOrder: body.displayOrder,
        isActive: body.isActive,
        showInMenu: body.showInMenu,
      },
      include: {
        _count: { select: { products: true } },
        children: {
          include: {
            _count: { select: { products: true } },
            children: {
              include: { _count: { select: { products: true } } },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 },
    );
  }
}

// DELETE: Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { id } = await params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 },
      );
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete category with ${existing._count.products} products`,
        },
        { status: 400 },
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 },
    );
  }
}
