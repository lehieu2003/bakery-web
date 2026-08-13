'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/hooks/use-auth';
import { useAuth } from '@/providers/auth-provider';
import type { LoginRequest } from '@/types/api.types';

export default function LoginScreenAdmin() {
  const router = useRouter();
  const { setUser } = useAuth();
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        setUser(user);
        router.push(user.role === 'ADMIN' ? '/admin/dashboard' : '/');
      },
    });
  };

  return (
    <div className='min-h-[calc(100vh-64px)] bg-background flex items-center justify-center px-4 py-16'>
      <div className='w-full max-w-md'>
        <Link
          href='/'
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors'
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className='bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden p-8'>
          <div className='mb-7'>
            <h1 className='font-serif text-2xl font-semibold text-foreground text-balance'>
              Admin Sign In
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Sign in to manage La Douceur
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className='space-y-5'
          >
            {/* Email */}
            <div className='space-y-1.5'>
              <label
                htmlFor='email'
                className='text-sm font-medium text-foreground'
              >
                Email
              </label>
              <input
                id='email'
                type='email'
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                placeholder='hello@example.com'
                className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                  errors.email ? 'border-destructive' : 'border-input'
                }`}
                autoComplete='email'
              />
              {errors.email && (
                <p className='text-xs text-destructive'>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className='space-y-1.5'>
              <label
                htmlFor='password'
                className='text-sm font-medium text-foreground'
              >
                Password
              </label>
              <div className='relative'>
                <input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  placeholder='Enter your password'
                  className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${
                    errors.password ? 'border-destructive' : 'border-input'
                  }`}
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword((prev) => !prev)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className='text-xs text-destructive'>
                  {errors.password.message}
                </p>
              )}
            </div>

            {loginMutation.isError && (
              <div className='bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
                <p className='text-xs text-destructive font-medium'>
                  {loginMutation.error?.message ||
                    'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.'}
                </p>
              </div>
            )}

            <button
              type='submit'
              disabled={loginMutation.isPending}
              className='w-full h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
