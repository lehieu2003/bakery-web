import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const routes = [
  '/',
  '/auth',
  '/search',
  '/cart',
  '/checkout/info',
  '/checkout/payment',
  '/checkout/success',
  '/profile',
  '/blog',
  '/ingredients',
  '/thanh-vien',
  '/ve-chung-toi',
  '/store',
  '/chinh-sach-giao-hang',
  '/chinh-sach-doi-tra',
  '/chinh-sach-bao-mat',
  '/dieu-khoan-su-dung',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  let dynamicRoutes: Array<{ path: string; lastModified: Date }> = [];

  try {
    const [pages, blogPosts] = await Promise.all([
      prisma.page.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.blogPost.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    dynamicRoutes = [
      ...pages.map((page) => ({
        path: `/${page.slug}`,
        lastModified: page.updatedAt,
      })),
      ...blogPosts.map((post) => ({
        path: `/blog/${post.slug}`,
        lastModified: post.updatedAt,
      })),
    ];
  } catch (error) {
    console.error('sitemap dynamic routes error:', error);
  }

  const entries: MetadataRoute.Sitemap = [
    ...routes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: route === '/' ? 1 : 0.7,
    })),
    ...dynamicRoutes.map((route) => ({
      url: `${siteUrl}${route.path}`,
      lastModified: route.lastModified,
      changeFrequency: 'weekly' as const,
      priority: route.path.startsWith('/blog/') ? 0.6 : 0.65,
    })),
  ];

  // Avoid duplicate URLs when a CMS page slug overlaps with an existing static route.
  const deduped = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    if (!deduped.has(entry.url)) {
      deduped.set(entry.url, entry);
      continue;
    }

    const current = deduped.get(entry.url)!;
    const currentTime = new Date(current.lastModified ?? 0).getTime();
    const nextTime = new Date(entry.lastModified ?? 0).getTime();
    deduped.set(
      entry.url,
      nextTime >= currentTime
        ? { ...current, ...entry, priority: Math.max(current.priority ?? 0, entry.priority ?? 0) }
        : current,
    );
  }

  return Array.from(deduped.values());
}
