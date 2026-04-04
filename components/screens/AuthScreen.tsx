'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import {
  useLogin,
  useRegister,
  useRegisterVerify,
  useResetPassword,
  useResetPasswordVerify,
} from '@/hooks/use-auth';
import type {
  LoginRequest,
  RegisterVerifyRequest,
  ResetPasswordVerifyRequest,
} from '@/types/api.types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const registerVerifyMutation = useRegisterVerify();
  const resetPasswordMutation = useResetPassword();
  const resetPasswordVerifyMutation = useResetPasswordVerify();

  // Login form
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginRequest>();

  // Forgot password form
  const {
    register: forgotRegister,
    handleSubmit: handleForgotSubmit,
    formState: { errors: forgotErrors },
    reset: resetForgotForm,
  } = useForm<ResetPasswordVerifyRequest>();

  // Register form
  const {
    register: registerRegister,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    control: registerControl,
  } = useForm<RegisterVerifyRequest>();

  // Login state
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotShowPw, setForgotShowPw] = useState(false);

  // Register state
  const [regShowPw, setRegShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const regPassword =
    useWatch({ control: registerControl, name: 'password' }) || '';

  const onLoginSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        // Update auth provider with user data
        setUser(user);

        // Navigate based on user role
        if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      },
    });
  };

  const onSendOtp = (email: string) => {
    if (!agreed) return;
    registerMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setOtpSent(true);
        },
      },
    );
  };

  const onRegisterSubmit = (data: RegisterVerifyRequest) => {
    if (!agreed) return;
    registerVerifyMutation.mutate(data, {
      onSuccess: (user) => {
        // Update auth provider with user data
        setUser(user);

        // Navigate based on user role
        if (user.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      },
    });
  };

  const onForgotSendOtp = (email: string) => {
    resetPasswordMutation.mutate(
      { email },
      {
        onSuccess: () => {
          setForgotOtpSent(true);
        },
      },
    );
  };

  const onForgotVerify = (data: ResetPasswordVerifyRequest) => {
    resetPasswordVerifyMutation.mutate(data, {
      onSuccess: () => {
        setForgotMode(false);
        setForgotOtpSent(false);
        setForgotShowPw(false);
        resetForgotForm();
      },
    });
  };

  const passwordStrength = (pw: string) => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };
  const strength = passwordStrength(regPassword);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = [
    '',
    'bg-red-400',
    'bg-amber-400',
    'bg-emerald-400',
    'bg-emerald-500',
  ][strength];

  return (
    <div className='min-h-[calc(100vh-64px)] bg-background flex items-center justify-center px-4 py-16'>
      <div className='w-full max-w-md'>
        {/* Back */}
        <Link
          href='/'
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors'
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        {/* Card */}
        <div className='bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden'>
          {/* Tab switcher */}
          <div className='grid grid-cols-2 border-b border-border/60'>
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-4 text-sm font-semibold tracking-wide capitalize transition-colors ${
                  tab === t
                    ? 'text-foreground border-b-2 border-primary -mb-px bg-background'
                    : 'text-muted-foreground hover:text-foreground bg-secondary/50'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className='p-8'>
            {tab === 'login' ? (
              <>
                {/* Header */}
                <div className='mb-7'>
                  <h1 className='font-serif text-2xl font-semibold text-foreground text-balance'>
                    Welcome back
                  </h1>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Sign in to your La Douceur account
                  </p>
                </div>

                {!forgotMode ? (
                  <form
                    onSubmit={handleLoginSubmit(onLoginSubmit)}
                    noValidate
                    className='space-y-5'
                  >
                    {/* Email */}
                    <div className='space-y-1.5'>
                      <label
                        htmlFor='login-email'
                        className='text-sm font-medium text-foreground'
                      >
                        Email
                      </label>
                      <input
                        id='login-email'
                        type='email'
                        {...loginRegister('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                        placeholder='hello@example.com'
                        className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${loginErrors.email ? 'border-destructive' : 'border-input'}`}
                        autoComplete='email'
                      />
                      {loginErrors.email && (
                        <p className='text-xs text-destructive'>
                          {loginErrors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className='space-y-1.5'>
                      <div className='flex items-center justify-between'>
                        <label
                          htmlFor='login-password'
                          className='text-sm font-medium text-foreground'
                        >
                          Password
                        </label>
                        <button
                          type='button'
                          onClick={() => setForgotMode(true)}
                          className='text-xs text-primary hover:underline'
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className='relative'>
                        <input
                          id='login-password'
                          type={loginShowPw ? 'text' : 'password'}
                          {...loginRegister('password', {
                            required: 'Password is required',
                            minLength: {
                              value: 6,
                              message: 'Password must be at least 6 characters',
                            },
                          })}
                          placeholder='Enter your password'
                          className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${loginErrors.password ? 'border-destructive' : 'border-input'}`}
                          autoComplete='current-password'
                        />
                        <button
                          type='button'
                          onClick={() => setLoginShowPw(!loginShowPw)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                          aria-label={
                            loginShowPw ? 'Hide password' : 'Show password'
                          }
                        >
                          {loginShowPw ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      {loginErrors.password && (
                        <p className='text-xs text-destructive'>
                          {loginErrors.password.message}
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
                ) : (
                  <form
                    onSubmit={
                      forgotOtpSent
                        ? handleForgotSubmit(onForgotVerify)
                        : handleForgotSubmit((data) => onForgotSendOtp(data.email))
                    }
                    noValidate
                    className='space-y-4'
                  >
                    <div className='space-y-1.5'>
                      <label
                        htmlFor='forgot-email'
                        className='text-sm font-medium text-foreground'
                      >
                        Email
                      </label>
                      <input
                        id='forgot-email'
                        type='email'
                        {...forgotRegister('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address',
                          },
                        })}
                        placeholder='hello@example.com'
                        className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.email ? 'border-destructive' : 'border-input'}`}
                        autoComplete='email'
                      />
                      {forgotErrors.email && (
                        <p className='text-xs text-destructive'>
                          {forgotErrors.email.message}
                        </p>
                      )}
                    </div>

                    {forgotOtpSent && (
                      <>
                        <div className='space-y-1.5'>
                          <label
                            htmlFor='forgot-otp'
                            className='text-sm font-medium text-foreground'
                          >
                            OTP Code
                          </label>
                          <input
                            id='forgot-otp'
                            type='text'
                            {...forgotRegister('otp', {
                              required: 'OTP is required',
                              pattern: {
                                value: /^[0-9]{6}$/,
                                message: 'OTP must be 6 digits',
                              },
                            })}
                            placeholder='Enter 6-digit OTP'
                            className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.otp ? 'border-destructive' : 'border-input'}`}
                            maxLength={6}
                          />
                          {forgotErrors.otp && (
                            <p className='text-xs text-destructive'>
                              {forgotErrors.otp.message}
                            </p>
                          )}
                        </div>

                        <div className='space-y-1.5'>
                          <label
                            htmlFor='forgot-password'
                            className='text-sm font-medium text-foreground'
                          >
                            New Password
                          </label>
                          <div className='relative'>
                            <input
                              id='forgot-password'
                              type={forgotShowPw ? 'text' : 'password'}
                              {...forgotRegister('newPassword', {
                                required: 'New password is required',
                                minLength: {
                                  value: 6,
                                  message:
                                    'New password must be at least 6 characters',
                                },
                              })}
                              placeholder='Enter your new password'
                              className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.newPassword ? 'border-destructive' : 'border-input'}`}
                              autoComplete='new-password'
                            />
                            <button
                              type='button'
                              onClick={() => setForgotShowPw(!forgotShowPw)}
                              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                              aria-label={
                                forgotShowPw ? 'Hide password' : 'Show password'
                              }
                            >
                              {forgotShowPw ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                          {forgotErrors.newPassword && (
                            <p className='text-xs text-destructive'>
                              {forgotErrors.newPassword.message}
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {(resetPasswordMutation.isError ||
                      resetPasswordVerifyMutation.isError) && (
                      <div className='bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
                        <p className='text-xs text-destructive font-medium'>
                          {resetPasswordMutation.error?.message ||
                            resetPasswordVerifyMutation.error?.message ||
                            'Khôi phục mật khẩu thất bại. Vui lòng thử lại.'}
                        </p>
                      </div>
                    )}

                    <div className='flex gap-2'>
                      <button
                        type='button'
                        onClick={() => {
                          setForgotMode(false);
                          setForgotOtpSent(false);
                          setForgotShowPw(false);
                          resetForgotForm();
                        }}
                        className='flex-1 h-11 rounded-full border border-input text-foreground text-sm font-semibold tracking-wide hover:bg-muted transition-all'
                      >
                        Back to Sign In
                      </button>
                      <button
                        type='submit'
                        disabled={
                          resetPasswordMutation.isPending ||
                          resetPasswordVerifyMutation.isPending
                        }
                        className='flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {forgotOtpSent
                          ? resetPasswordVerifyMutation.isPending
                            ? 'Resetting...'
                            : 'Reset Password'
                          : resetPasswordMutation.isPending
                            ? 'Sending...'
                            : 'Send OTP Code'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Divider */}
                <div className='flex items-center gap-3 my-6'>
                  <span className='flex-1 h-px bg-border/60' />
                  <span className='text-xs text-muted-foreground'>or</span>
                  <span className='flex-1 h-px bg-border/60' />
                </div>

                <p className='text-center text-sm text-muted-foreground'>
                  {"Don't have an account? "}
                  <button
                    onClick={() => setTab('register')}
                    className='text-primary font-medium hover:underline'
                  >
                    Create one
                  </button>
                </p>
              </>
            ) : (
              <>
                {/* Header */}
                <div className='mb-7'>
                  <h1 className='font-serif text-2xl font-semibold text-foreground text-balance'>
                    Join La Douceur
                  </h1>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Create an account to earn points and enjoy member savings
                  </p>
                </div>

                {/* Membership perks teaser */}
                <div className='bg-secondary/70 rounded-xl p-4 mb-6 space-y-2'>
                  {[
                    'Up to 15% off every order',
                    'Earn points on every purchase',
                    'Exclusive member-only offers',
                  ].map((perk) => (
                    <div key={perk} className='flex items-center gap-2.5'>
                      <span className='w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0'>
                        <Check
                          size={10}
                          className='text-primary'
                          strokeWidth={3}
                        />
                      </span>
                      <span className='text-xs text-foreground'>{perk}</span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={
                    otpSent
                      ? handleRegisterSubmit(onRegisterSubmit)
                      : handleRegisterSubmit((data) => onSendOtp(data.email))
                  }
                  noValidate
                  className='space-y-4'
                >
                  {!otpSent ? (
                    <>
                      {/* Email */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-email'
                          className='text-sm font-medium text-foreground'
                        >
                          Email
                        </label>
                        <input
                          id='reg-email'
                          type='email'
                          {...registerRegister('email', {
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address',
                            },
                          })}
                          placeholder='hello@example.com'
                          className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.email ? 'border-destructive' : 'border-input'}`}
                          autoComplete='email'
                        />
                        {registerErrors.email && (
                          <p className='text-xs text-destructive'>
                            {registerErrors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Terms */}
                      <div className='space-y-1'>
                        <label className='flex items-start gap-3 cursor-pointer'>
                          <button
                            type='button'
                            role='checkbox'
                            aria-checked={agreed}
                            onClick={() => setAgreed(!agreed)}
                            className={`mt-0.5 w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors ${agreed ? 'bg-primary border-primary' : 'border-input'}`}
                          >
                            {agreed && (
                              <Check
                                size={10}
                                className='text-white'
                                strokeWidth={3}
                              />
                            )}
                          </button>
                          <span className='text-xs text-muted-foreground leading-relaxed'>
                            I agree to the{' '}
                            <span className='text-primary'>
                              Terms of Service
                            </span>{' '}
                            and{' '}
                            <span className='text-primary'>Privacy Policy</span>
                          </span>
                        </label>
                        {!agreed && registerMutation.isError && (
                          <p className='text-xs text-destructive pl-7'>
                            You must agree to the terms
                          </p>
                        )}
                      </div>

                      {registerMutation.isError && (
                        <div className='bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
                          <p className='text-xs text-destructive font-medium'>
                            {registerMutation.error?.message ||
                              'Đăng ký thất bại. Vui lòng thử lại.'}
                          </p>
                        </div>
                      )}

                      <button
                        type='submit'
                        disabled={registerMutation.isPending || !agreed}
                        className='w-full h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {registerMutation.isPending
                          ? 'Sending...'
                          : 'Send OTP Code'}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* OTP */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-otp'
                          className='text-sm font-medium text-foreground'
                        >
                          OTP Code
                        </label>
                        <input
                          id='reg-otp'
                          type='text'
                          {...registerRegister('otp', {
                            required: 'OTP is required',
                            pattern: {
                              value: /^[0-9]{6}$/,
                              message: 'OTP must be 6 digits',
                            },
                          })}
                          placeholder='Enter 6-digit OTP'
                          className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.otp ? 'border-destructive' : 'border-input'}`}
                          maxLength={6}
                        />
                        {registerErrors.otp && (
                          <p className='text-xs text-destructive'>
                            {registerErrors.otp.message}
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground'>
                          Check your email for the OTP code
                        </p>
                      </div>

                      {/* Full name */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-name'
                          className='text-sm font-medium text-foreground'
                        >
                          Full Name (Optional)
                        </label>
                        <input
                          id='reg-name'
                          type='text'
                          {...registerRegister('name')}
                          placeholder='Nguyen Thi Linh'
                          className='w-full h-11 px-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
                          autoComplete='name'
                        />
                      </div>

                      {/* Password */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-password'
                          className='text-sm font-medium text-foreground'
                        >
                          Password
                        </label>
                        <div className='relative'>
                          <input
                            id='reg-password'
                            type={regShowPw ? 'text' : 'password'}
                            {...registerRegister('password', {
                              required: 'Password is required',
                              minLength: {
                                value: 8,
                                message:
                                  'Password must be at least 8 characters',
                              },
                            })}
                            placeholder='Minimum 8 characters'
                            className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.password ? 'border-destructive' : 'border-input'}`}
                            autoComplete='new-password'
                          />
                          <button
                            type='button'
                            onClick={() => setRegShowPw(!regShowPw)}
                            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                            aria-label={
                              regShowPw ? 'Hide password' : 'Show password'
                            }
                          >
                            {regShowPw ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        {/* Strength bar */}
                        {regPassword && (
                          <div className='flex items-center gap-2 mt-1.5'>
                            <div className='flex gap-1 flex-1'>
                              {[1, 2, 3, 4].map((n) => (
                                <span
                                  key={n}
                                  className={`h-1 flex-1 rounded-full transition-colors ${n <= strength ? strengthColor : 'bg-border'}`}
                                />
                              ))}
                            </div>
                            <span className='text-xs text-muted-foreground w-10 text-right'>
                              {strengthLabel}
                            </span>
                          </div>
                        )}
                        {registerErrors.password && (
                          <p className='text-xs text-destructive'>
                            {registerErrors.password.message}
                          </p>
                        )}
                      </div>

                      {registerVerifyMutation.isError && (
                        <div className='bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
                          <p className='text-xs text-destructive font-medium'>
                            {registerVerifyMutation.error?.message ||
                              'Xác thực thất bại. Vui lòng kiểm tra OTP.'}
                          </p>
                        </div>
                      )}

                      <div className='flex gap-2'>
                        <button
                          type='button'
                          onClick={() => setOtpSent(false)}
                          className='flex-1 h-11 rounded-full border border-input text-foreground text-sm font-semibold tracking-wide hover:bg-muted transition-all'
                        >
                          Back
                        </button>
                        <button
                          type='submit'
                          disabled={registerVerifyMutation.isPending}
                          className='flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {registerVerifyMutation.isPending
                            ? 'Creating...'
                            : 'Create Account'}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                <p className='text-center text-sm text-muted-foreground mt-5'>
                  Already have an account?{' '}
                  <button
                    onClick={() => setTab('login')}
                    className='text-primary font-medium hover:underline'
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
