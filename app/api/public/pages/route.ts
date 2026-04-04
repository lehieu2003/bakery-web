import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PublicPageListItem = {
  id: string;
  title: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type PublicPagesDeps = {
  findPublishedPages: () => Promise<PublicPageListItem[]>;
};

const defaultDeps: PublicPagesDeps = {
  findPublishedPages: () =>
    prisma.page.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
};

export async function handleGetPublicPagesRequest(
  deps: PublicPagesDeps = defaultDeps,
) {
  const pages = await deps.findPublishedPages();
  return {
    status: 200,
    body: {
      success: true as const,
      data: pages,
    },
  };
}

// GET /api/public/pages - List published pages
export async function GET() {
  try {
    const result = await handleGetPublicPagesRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get public pages error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pages' },
      { status: 500 },
    );
  }
}
