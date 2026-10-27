'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserX } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useDeleteAccount, useRequestDeleteAccountOtp } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';

const erased = [
  'Họ tên, email, số điện thoại',
  'Sổ địa chỉ giao hàng',
  'Giỏ hàng và danh sách yêu thích',
  'Điểm thành viên và hạng thành viên',
  'Mọi phiên đăng nhập trên web và ứng dụng',
];

const retained = [
  'Lịch sử đơn hàng được lưu ẩn danh tối thiểu 5 năm cho mục đích kế toán và giải quyết tranh chấp (theo Chính sách bảo mật).',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout: clearAuthUser } = useAuth();
  const { mutate: deleteAccount, isPending } = useDeleteAccount();
  const { mutate: requestOtp, isPending: isSendingOtp } = useRequestDeleteAccountOtp();
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const describeError = (err: unknown) =>
    err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.';

  // A code, not the password: accounts created through Google have none.
  const handleSendOtp = () => {
    setError(null);
    requestOtp(undefined, {
      onSuccess: () => setOtpSent(true),
      onError: (err) => setError(describeError(err)),
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    deleteAccount(otp.trim(), {
      onSuccess: () => {
        clearAuthUser();
        setDone(true);
      },
      onError: (err) => setError(describeError(err)),
    });
  };

  return (
    <div className='font-sans py-8 max-w-2xl'>
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center'>
            <UserX size={20} className='text-destructive' />
          </div>
          <p className='text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium'>
            Tài khoản
          </p>
        </div>
        <h1 className='font-serif text-3xl md:text-4xl font-bold text-foreground'>
          Xóa tài khoản
        </h1>
        <p className='text-sm text-muted-foreground mt-3 text-pretty'>
          Bạn có thể xóa tài khoản Phương Loan Bakery bất cứ lúc nào, trên website
          này hoặc trong ứng dụng (Tài khoản → Xóa tài khoản). Việc xóa không thể
          hoàn tác.
        </p>
      </div>

      <section className='space-y-4 mb-8'>
        <div className='bg-card border border-border rounded-2xl p-5'>
          <p className='font-semibold text-sm text-foreground mb-2'>Dữ liệu bị xóa</p>
          <ul className='space-y-1.5'>
            {erased.map((item) => (
              <li key={item} className='flex items-start gap-2 text-sm text-muted-foreground'>
                <span className='w-1.5 h-1.5 rounded-full bg-destructive mt-2 shrink-0' />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className='bg-card border border-border rounded-2xl p-5'>
          <p className='font-semibold text-sm text-foreground mb-2'>Dữ liệu được giữ lại</p>
          <ul className='space-y-1.5'>
            {retained.map((item) => (
              <li key={item} className='flex items-start gap-2 text-sm text-muted-foreground'>
                <span className='w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0' />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className='text-sm text-muted-foreground'>
          Nếu bạn còn đơn hàng đang xử lý, vui lòng chờ đơn hoàn tất hoặc hủy đơn
          trước khi xóa tài khoản.
        </p>
      </section>

      {done ? (
        <div className='bg-card border border-border rounded-2xl p-6 text-center'>
          <p className='font-semibold text-foreground mb-2'>Tài khoản của bạn đã được xóa.</p>
          <p className='text-sm text-muted-foreground mb-4'>
            Cảm ơn bạn đã đồng hành cùng Phương Loan Bakery.
          </p>
          <button
            onClick={() => router.push('/')}
            className='px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium'
          >
            Về trang chủ
          </button>
        </div>
      ) : !isAuthenticated ? (
        <div className='bg-card border border-border rounded-2xl p-6'>
          <p className='text-sm text-muted-foreground mb-4'>
            Vui lòng đăng nhập vào tài khoản bạn muốn xóa.
          </p>
          <Link
            href='/auth'
            className='inline-block px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium'
          >
            Đăng nhập
          </Link>
        </div>
      ) : isAdmin ? (
        <div className='bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground'>
          Tài khoản quản trị viên không thể tự xóa.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className='bg-card border border-destructive/30 rounded-2xl p-6 space-y-4'
        >
          <p className='text-sm text-foreground'>
            Đang đăng nhập: <span className='font-semibold'>{user?.email}</span>
          </p>
          <div>
            <p className='text-sm font-medium text-foreground'>Xác nhận bằng mã gửi qua email</p>
            <p className='text-xs text-muted-foreground mt-1'>
              {otpSent
                ? 'Mã gồm 6 chữ số, có hiệu lực trong 5 phút.'
                : 'Chúng tôi sẽ gửi mã xác nhận đến email ở trên.'}
            </p>
            <div className='mt-2 flex gap-2'>
              <input
                type='text'
                inputMode='numeric'
                autoComplete='one-time-code'
                maxLength={6}
                placeholder='Mã xác nhận'
                aria-label='Mã xác nhận'
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={!otpSent}
                className='flex-1 min-w-0 rounded-xl border border-border bg-background px-4 py-2.5 text-sm tracking-widest disabled:opacity-50'
              />
              <button
                type='button'
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                className='shrink-0 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground disabled:opacity-50'
              >
                {isSendingOtp ? 'Đang gửi…' : otpSent ? 'Gửi lại mã' : 'Gửi mã'}
              </button>
            </div>
          </div>
          <label className='flex items-start gap-2 text-sm text-muted-foreground'>
            <input
              type='checkbox'
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className='mt-1'
            />
            Tôi hiểu tài khoản, điểm thành viên và dữ liệu cá nhân sẽ bị xóa vĩnh viễn.
          </label>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <button
            type='submit'
            disabled={otp.length !== 6 || !confirmed || isPending}
            className='w-full px-5 py-2.5 rounded-full bg-destructive text-white text-sm font-medium disabled:opacity-50'
          >
            {isPending ? 'Đang xóa…' : 'Xóa tài khoản vĩnh viễn'}
          </button>
        </form>
      )}
    </div>
  );
}
