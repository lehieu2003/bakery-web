import Link from 'next/link';
import WebNavbar from '@/components/web/navbar';
import WebFooter from '@/components/web/footer';

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col bg-background'>
      <WebNavbar />
      <main className='flex-1 mx-auto w-full max-w-xl px-6 py-20 text-center'>
        <h1 className='text-2xl font-semibold'>Page not found</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          The page you requested does not exist.
        </p>
        <Link
          href='/'
          className='mt-6 inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted'
        >
          Back to home
        </Link>
      </main>
      <WebFooter />
    </div>
  );
}
