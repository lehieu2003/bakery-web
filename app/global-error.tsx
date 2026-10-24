'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='vi'>
      <body>
        <main className='mx-auto max-w-xl px-6 py-20 text-center'>
          <h1 className='text-2xl font-semibold'>Lỗi ứng dụng</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {error.message || 'Đã xảy ra lỗi nghiêm trọng.'}
          </p>
          <button
            onClick={reset}
            className='mt-6 rounded-md border px-4 py-2 text-sm hover:bg-muted'
          >
            Tải lại trang
          </button>
        </main>
      </body>
    </html>
  );
}
