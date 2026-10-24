'use client';

import { ArrowRight } from 'lucide-react';

export default function NewsletterForm() {
  return (
    <form
      className='flex w-full md:w-auto gap-2'
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type='email'
        placeholder='Địa chỉ email của bạn'
        aria-label='Email đăng ký nhận bản tin'
        className='flex-1 md:w-72 px-4 py-2.5 rounded-md bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors'
      />
      <button
        type='submit'
        className='flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0'
      >
        Đăng ký
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
