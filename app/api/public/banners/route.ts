import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PublicBannersDeps = {
  findActiveBanners: () => Promise<unknown[]>;
};

const defaultDeps: PublicBannersDeps = {
  findActiveBanners: () =>
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    }),
};

export async function handleGetPublicBannersRequest(
  deps: PublicBannersDeps = defaultDeps,
) {
  const banners = await deps.findActiveBanners();
  return {
    status: 200,
    body: {
      success: true as const,
      data: banners,
    },
  };
}

// GET: List all active banners (public endpoint - no auth required)
export async function GET() {
  try {
    const result = await handleGetPublicBannersRequest();
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Get public banners error:', error);
    return NextResponse.json(
      { success: false, error: 'Không tải được banner' },
      { status: 500 },
    );
  }
}
