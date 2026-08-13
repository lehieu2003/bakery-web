import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { CartProvider } from '@/lib/cart-store';
import { Toaster } from 'sonner';
import '../styles/globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'La Douceur – Tiệm bánh thủ công tại Sài Gòn',
    template: '%s | La Douceur',
  },
  description:
    'La Douceur là tiệm bánh thủ công tại Sài Gòn, chuyên bánh kem, bánh ngọt và quà tặng cho sinh nhật, tiệc cưới và những dịp đặc biệt.',
  applicationName: 'La Douceur',
  generator: 'Next.js',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'La Douceur',
    title: 'La Douceur – Tiệm bánh thủ công tại Sài Gòn',
    description:
      'Bánh kem và bánh ngọt thủ công từ nguyên liệu cao cấp, làm mới mỗi ngày tại La Douceur.',
    url: '/',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'La Douceur Artisan Bakery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Douceur – Tiệm bánh thủ công tại Sài Gòn',
    description:
      'Bánh kem và bánh ngọt thủ công từ nguyên liệu cao cấp, làm mới mỗi ngày tại La Douceur.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='vi'>
      <body
        className={`${playfair.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <CartProvider>
              {children}
              <Toaster position='top-right' richColors closeButton />
            </CartProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
