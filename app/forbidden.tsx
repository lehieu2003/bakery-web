import Link from 'next/link';

export default function Forbidden() {
  return (
    <main className='mx-auto max-w-xl px-6 py-20 text-center'>
      <h1 className='text-2xl font-semibold'>Truy cập bị từ chối</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Bạn không có quyền truy cập trang này.
      </p>
      <Link
        href='/'
        className='mt-6 inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted'
      >
        Về trang chủ
      </Link>
    </main>
  );
}
