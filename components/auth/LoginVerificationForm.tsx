'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useVerifyLogin } from '@/hooks/use-auth';
import type { LoginVerification, User } from '@/types/api.types';

/**
 * Second step of an admin sign-in from a device that is not the trusted one:
 * the 6-digit code emailed to the admin. On success this browser becomes the
 * trusted device and the previous one is signed out.
 */
export default function LoginVerificationForm({
  verification,
  onVerified,
  onCancel,
}: {
  verification: LoginVerification;
  onVerified: (user: User) => void;
  onCancel: () => void;
}) {
  const verifyMutation = useVerifyLogin();
  const [otp, setOtp] = useState('');
  const valid = /^\d{6}$/.test(otp);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    verifyMutation.mutate(
      { challengeId: verification.challengeId, otp },
      { onSuccess: onVerified },
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className='space-y-5'>
      <div className='flex gap-3 rounded-xl bg-secondary/70 p-4'>
        <ShieldCheck size={20} className='mt-0.5 shrink-0 text-primary' aria-hidden='true' />
        <div className='text-sm text-foreground'>
          <p className='font-semibold'>Xác minh thiết bị mới</p>
          <p className='mt-1 text-muted-foreground'>
            Tài khoản quản trị chỉ dùng được trên một trình duyệt. Nhập mã 6 số
            vừa gửi tới <span className='font-medium text-foreground'>{verification.email}</span>{' '}
            để dùng trình duyệt này; trình duyệt cũ sẽ bị đăng xuất.
          </p>
        </div>
      </div>

      <div className='space-y-1.5'>
        <label htmlFor='login-otp' className='text-sm font-medium text-foreground'>
          Mã xác minh
        </label>
        <input
          id='login-otp'
          inputMode='numeric'
          autoComplete='one-time-code'
          maxLength={6}
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          placeholder='••••••'
          className='w-full h-11 px-4 rounded-xl border border-input bg-background text-center text-lg tracking-[0.5em] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
        />
      </div>

      {verifyMutation.isError && (
        <div className='bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
          <p className='text-xs text-destructive font-medium'>
            {verifyMutation.error?.message || 'Mã xác minh không đúng hoặc đã hết hạn'}
          </p>
        </div>
      )}

      <button
        type='submit'
        disabled={!valid || verifyMutation.isPending}
        className='w-full h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {verifyMutation.isPending ? 'Đang xác minh...' : 'Xác minh'}
      </button>
      <button
        type='button'
        onClick={onCancel}
        className='w-full text-sm text-muted-foreground hover:text-foreground transition-colors'
      >
        Quay lại đăng nhập
      </button>
    </form>
  );
}
