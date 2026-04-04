import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PublicPageDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PublicPageDetailDeps = {
  findPublishedPageBySlug: (slug: string) => Promise<PublicPageDetail | null>;
};

const defaultDeps: PublicPageDetailDeps = {
  findPublishedPageBySlug: (slug) =>
    prisma.page.findFirst({
      where: { slug, isPublished: true },
    }),
};

export async function handleGetPublicPageBySlugRequest(
  rawSlug: string,
  deps: PublicPageDetailDeps = defaultDeps,
) {
  const slug = rawSlug.trim();
  if (!slug) {
    return {
      status: 400,
      body: { success: false as const, error: 'Invalid page slug' },
    };
  }

  const page = await deps.findPublishedPageBySlug(slug);

  if (!page) {
    return {
      status: 404,
      body: { success: false as const, error: 'Page not found' },
    };
  }

  return {
    status: 200,
    body: { success: true as const, data: page },
  };
}

// GET /api/public/pages/[slug] - Get page by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const result = await handleGetPublicPageBySlugRequest(slug);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get public page error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch page' },
      { status: 500 },
    );
  }
}
