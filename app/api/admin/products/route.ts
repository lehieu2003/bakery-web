import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import type { CreateProductRequest } from '@/types/api.types';

// GET /api/admin/products - List all products (PUBLIC - no auth required)
export async function GET(request: NextRequest) {
  try {
    // Public endpoint - no auth required for viewing products
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (categoryId) {
      // Include products from child categories too
      const childCategories = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true },
      });
      const categoryIds = [categoryId, ...childCategories.map((c) => c.id)];
      where.categories = { some: { categoryId: { in: categoryIds } } };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          images: { orderBy: { displayOrder: 'asc' } },
          variants: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin products list error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}

// POST /api/admin/products - Create product
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = (await request.json()) as Partial<CreateProductRequest>;
    const {
      name,
      slug,
      description,
      shortDescription,
      price,
      comparePrice,
      costPrice,
      sku,
      barcode,
      categoryIds,
      stock,
      trackStock,
      weight,
      images,
      variants,
      isActive,
      isFeatured,
    } = body;

    // Validate required fields
    if (!name || !slug || !price) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc' },
        { status: 400 },
      );
    }

    // Check if slug already exists
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Slug đã tồn tại' },
        { status: 400 },
      );
    }

    // Build image create data
    const imageCreateData: {
      url: string;
      isPrimary: boolean;
      displayOrder: number;
    }[] = [];
    if (images && Array.isArray(images)) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const url = typeof img === 'string' ? img : img?.url;
        if (url && !imageCreateData.some((d) => d.url === url)) {
          imageCreateData.push({
            url,
            isPrimary: imageCreateData.length === 0,
            displayOrder: i,
          });
        }
      }
    }

    // Build variant create data
    const variantCreateData: {
      name: string;
      sku: string | null;
      price: number;
      stock: number;
    }[] = [];
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        if (v.name && typeof v.price === 'number') {
          variantCreateData.push({
            name: v.name,
            sku: v.sku || null,
            price: v.price,
            stock: typeof v.stock === 'number' ? v.stock : 0,
          });
        }
      }
    }

    // Build category connections
    const categoryConnect = Array.isArray(categoryIds)
      ? categoryIds.map((cid: string) => ({ productId: '', categoryId: cid }))
      : [];

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        shortDescription,
        price,
        comparePrice,
        costPrice,
        sku,
        barcode,
        stock: stock || 0,
        trackStock: trackStock !== undefined ? trackStock : true,
        weight,
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured || false,
        ...(imageCreateData.length > 0
          ? { images: { create: imageCreateData } }
          : {}),
        ...(variantCreateData.length > 0
          ? { variants: { create: variantCreateData } }
          : {}),
        ...(categoryConnect.length > 0
          ? {
              categories: {
                create: categoryConnect.map((c: { categoryId: string }) => ({
                  categoryId: c.categoryId,
                })),
              },
            }
          : {}),
      },
      include: {
        categories: { include: { category: true } },
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { product },
    });
  } catch (error) {
    console.error('Admin create product error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const status =
      errorMessage === 'Unauthorized'
        ? 401
        : errorMessage === 'Forbidden: Admin access required'
          ? 403
          : 500;
    return NextResponse.json(
      { success: false, error: errorMessage || 'Đã có lỗi xảy ra' },
      { status },
    );
  }
}
