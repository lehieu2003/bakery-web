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
  title: 'Abby – Đồ Làm Bánh, Nấu Ăn Và Pha Chế',
  description: 'Abby - Chuyên cung cấp nguyên liệu và dụng cụ làm bánh, nấu ăn và pha chế chất lượng cao.',
  generator: 'v0.app',
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
    <html lang='en'>
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
