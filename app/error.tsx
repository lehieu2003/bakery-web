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
      <h2 className='text-2xl font-semibold'>Đã xảy ra lỗi</h2>
      <p className='mt-2 text-sm text-muted-foreground'>
        {error.message || 'Lỗi không xác định từ ứng dụng.'}
      </p>
      <button
        onClick={reset}
        className='mt-6 rounded-md border px-4 py-2 text-sm hover:bg-muted'
      >
        Thử lại
      </button>
    </div>
  );
}
