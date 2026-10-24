import Link from 'next/link';

export default function Unauthorized() {
  return (
    <main className='mx-auto max-w-xl px-6 py-20 text-center'>
      <h1 className='text-2xl font-semibold'>Chưa xác thực</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Vui lòng đăng nhập để tiếp tục.
      </p>
      <Link
        href='/auth'
        className='mt-6 inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted'
      >
        Đăng nhập
      </Link>
    </main>
  );
}
