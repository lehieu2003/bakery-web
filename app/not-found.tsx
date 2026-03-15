import Link from 'next/link';

export default function NotFound() {
  return (
    <main className='mx-auto max-w-xl px-6 py-20 text-center'>
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
  );
}
