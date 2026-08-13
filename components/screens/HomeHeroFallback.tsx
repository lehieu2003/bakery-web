import Image from 'next/image';
import Link from 'next/link';

export default function HomeHeroFallback() {
  return (
    <section className='relative isolate min-h-[560px] overflow-hidden bg-[#3a211b] text-white'>
      <Image
        src='/images/hero-cake.jpg'
        alt='Bánh kem La Douceur được trang trí tinh tế trên bàn tiệc'
        fill
        priority
        className='object-cover opacity-70'
        sizes='100vw'
      />
      <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(31,14,10,0.88),rgba(31,14,10,0.48)_48%,rgba(31,14,10,0.18))]' />
      <div
        data-home-float
        className='absolute right-[8%] top-24 hidden h-40 w-40 rounded-full border border-white/25 bg-white/10 backdrop-blur-md lg:block'
        aria-hidden='true'
      />
      <div className='relative z-10 mx-auto flex min-h-[560px] max-w-7xl items-center px-5 py-20 lg:px-8'>
        <div className='max-w-2xl'>
          <p
            data-home-intro
            className='mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-[#f3cfa8]'
          >
            Baked fresh daily in Saigon
          </p>
          <h1
            data-home-intro
            className='font-serif text-4xl font-semibold leading-[1.05] text-balance md:text-6xl'
          >
            La Douceur, tiệm bánh cho những dịp cần thật chỉn chu
          </h1>
          <p
            data-home-intro
            className='mt-6 max-w-xl text-base leading-8 text-white/82 md:text-lg'
          >
            Bánh phô mai tan chảy, cookies bơ thơm và không gian ngồi lại ấm áp
            cho những cuộc gặp cuối tuần.
          </p>
          <div data-home-intro className='mt-8 flex flex-wrap gap-3'>
            <Link
              href='/store'
              className='inline-flex items-center justify-center rounded-full bg-[#f3cfa8] px-6 py-3 text-sm font-bold text-[#3a211b] shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5'
            >
              Khám phá menu
            </Link>
            <Link
              href='/ve-chung-toi'
              className='inline-flex items-center justify-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/18'
            >
              Về La Douceur
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
