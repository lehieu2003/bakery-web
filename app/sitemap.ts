import type { MetadataRoute } from 'next';

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

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
