'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className='mx-auto max-w-xl px-6 py-20 text-center'>
      <h2 className='text-2xl font-semibold'>Something went wrong</h2>
      <p className='mt-2 text-sm text-muted-foreground'>
        {error.message || 'Unexpected application error.'}
      </p>
      <button
        onClick={reset}
        className='mt-6 rounded-md border px-4 py-2 text-sm hover:bg-muted'
      >
        Try again
      </button>
    </div>
  );
}
