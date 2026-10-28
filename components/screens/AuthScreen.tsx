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
  LoginVerification,
  RegisterVerifyRequest,
  ResetPasswordVerifyRequest,
  User,
} from '@/types/api.types';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import LoginVerificationForm from '@/components/auth/LoginVerificationForm';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  // An admin on a new device: password or Google sign-in emailed a code.
  const [verification, setVerification] = useState<LoginVerification | null>(
    () => {
      const challengeId = searchParams.get('verify');
      return challengeId
        ? { challengeId, email: searchParams.get('email') ?? 'email quản trị' }
        : null;
    },
  );
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

  const signedIn = (user: User) => {
    // Update auth provider with user data
    setUser(user);

    // Navigate based on user role
    if (user.role === 'ADMIN') {
      router.push('/admin/dashboard');
    } else {
      router.push('/');
    }
  };

  const onLoginSubmit = (data: LoginRequest) => {
    loginMutation.mutate(data, {
      onSuccess: (result) => {
        if (result.kind === 'verify') {
          setVerification(result);
          return;
        }
        signedIn(result.user);
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
  const strengthLabel = ['', 'Yếu', 'Trung bình', 'Tốt', 'Mạnh'][strength];
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
          Về trang chủ
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
                {t === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            ))}
          </div>

          <div className='p-8'>
            {tab === 'login' ? (
              <>
                {/* Header */}
                <div className='mb-7'>
                  <h1 className='font-serif text-2xl font-semibold text-foreground text-balance'>
                    Chào mừng trở lại
                  </h1>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Đăng nhập vào tài khoản Phương Loan Bakery của bạn
                  </p>
                </div>

                {oauthError && (
                  <div className='mb-5 bg-destructive/10 border border-destructive/50 rounded-xl p-3'>
                    <p className='text-xs text-destructive font-medium'>
                      Đăng nhập Google không thành công: {decodeURIComponent(oauthError)}
                    </p>
                  </div>
                )}

                {verification ? (
                  <LoginVerificationForm
                    verification={verification}
                    onVerified={signedIn}
                    onCancel={() => {
                      setVerification(null);
                      router.replace('/auth');
                    }}
                  />
                ) : !forgotMode ? (
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
                          required: 'Vui lòng nhập email',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Địa chỉ email không hợp lệ',
                          },
                        })}
                        placeholder='hello@example.com'
                        className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${loginErrors.email ? 'border-destructive' : 'border-input'}`}
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
                          Mật khẩu
                        </label>
                        <button
                          type='button'
                          onClick={() => setForgotMode(true)}
                          className='text-xs text-primary hover:underline'
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                      <div className='relative'>
                        <input
                          id='login-password'
                          type={loginShowPw ? 'text' : 'password'}
                          {...loginRegister('password', {
                            required: 'Vui lòng nhập mật khẩu',
                            minLength: {
                              value: 6,
                              message: 'Mật khẩu phải có ít nhất 6 ký tự',
                            },
                          })}
                          placeholder='Nhập mật khẩu'
                          className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${loginErrors.password ? 'border-destructive' : 'border-input'}`}

                          autoComplete='current-password'
                        />
                        <button
                          type='button'
                          onClick={() => setLoginShowPw(!loginShowPw)}
                          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                          aria-label={
                            loginShowPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
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
                      {loginMutation.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
                    </button>

                    <div className='flex items-center gap-3 pt-2'>
                      <span className='flex-1 h-px bg-border/60' />
                      <span className='text-xs text-muted-foreground'>hoặc tiếp tục với</span>
                      <span className='flex-1 h-px bg-border/60' />
                    </div>

                    <GoogleLoginButton />
                  </form>
                ) : (
                  <form
                    onSubmit={
                      forgotOtpSent
                        ? handleForgotSubmit(onForgotVerify)
                        : handleForgotSubmit((data) =>
                            onForgotSendOtp(data.email),
                          )
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
                          required: 'Vui lòng nhập email',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Địa chỉ email không hợp lệ',
                          },
                        })}
                        placeholder='hello@example.com'
                        className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.email ? 'border-destructive' : 'border-input'}`}
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
                            Mã OTP
                          </label>
                          <input
                            id='forgot-otp'
                            type='text'
                            {...forgotRegister('otp', {
                              required: 'Vui lòng nhập mã OTP',
                              pattern: {
                                value: /^[0-9]{6}$/,
                                message: 'Mã OTP phải có 6 chữ số',
                              },
                            })}
                            placeholder='Nhập mã OTP 6 chữ số'
                            className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.otp ? 'border-destructive' : 'border-input'}`}

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
                            Mật khẩu mới
                          </label>
                          <div className='relative'>
                            <input
                              id='forgot-password'
                              type={forgotShowPw ? 'text' : 'password'}
                              {...forgotRegister('newPassword', {
                                required: 'Vui lòng nhập mật khẩu mới',
                                minLength: {
                                  value: 8,
                                  message:
                                    'Mật khẩu mới phải có ít nhất 8 ký tự',
                                },
                              })}
                              placeholder='Nhập mật khẩu mới'
                              className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${forgotErrors.newPassword ? 'border-destructive' : 'border-input'}`}

                              autoComplete='new-password'
                            />
                            <button
                              type='button'
                              onClick={() => setForgotShowPw(!forgotShowPw)}
                              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                              aria-label={
                                forgotShowPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
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
                        Về đăng nhập
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
                            ? 'Đang đặt lại…'
                            : 'Đặt lại mật khẩu'
                          : resetPasswordMutation.isPending
                            ? 'Đang gửi…'
                            : 'Gửi mã OTP'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Divider */}
                <div className='flex items-center gap-3 my-6'>
                  <span className='flex-1 h-px bg-border/60' />
                  <span className='text-xs text-muted-foreground'>hoặc</span>
                  <span className='flex-1 h-px bg-border/60' />
                </div>

                <p className='text-center text-sm text-muted-foreground'>
                  {'Chưa có tài khoản? '}
                  <button
                    onClick={() => setTab('register')}
                    className='text-primary font-medium hover:underline'
                  >
                    Tạo tài khoản
                  </button>
                </p>
              </>
            ) : (
              <>
                {/* Header */}
                <div className='mb-7'>
                  <h1 className='font-serif text-2xl font-semibold text-foreground text-balance'>
                    Tham gia Phương Loan Bakery
                  </h1>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Tạo tài khoản để tích điểm và nhận ưu đãi thành viên
                  </p>
                </div>

                {/* Membership perks teaser */}
                <div className='bg-secondary/70 rounded-xl p-4 mb-6 space-y-2'>
                  {[
                    'Giảm đến 15% cho mỗi đơn hàng',
                    'Tích điểm với mỗi lần mua hàng',
                    'Ưu đãi độc quyền dành riêng cho thành viên',
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
                            required: 'Vui lòng nhập email',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Địa chỉ email không hợp lệ',
                            },
                          })}
                          placeholder='hello@example.com'
                          className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.email ? 'border-destructive' : 'border-input'}`}
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
                            Tôi đồng ý với{' '}
                            <span className='text-primary'>
                              Điều khoản sử dụng
                            </span>{' '}
                            và{' '}
                            <span className='text-primary'>Chính sách bảo mật</span>
                          </span>
                        </label>
                        {!agreed && registerMutation.isError && (
                          <p className='text-xs text-destructive pl-7'>
                            Bạn cần đồng ý với điều khoản
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
                          ? 'Đang gửi…'
                          : 'Gửi mã OTP'}
                      </button>

                      <div className='flex items-center gap-3 pt-2'>
                        <span className='flex-1 h-px bg-border/60' />
                        <span className='text-xs text-muted-foreground'>hoặc tiếp tục với</span>
                        <span className='flex-1 h-px bg-border/60' />
                      </div>

                      <GoogleLoginButton />
                    </>
                  ) : (
                    <>
                      {/* OTP */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-otp'
                          className='text-sm font-medium text-foreground'
                        >
                          Mã OTP
                        </label>
                        <input
                          id='reg-otp'
                          type='text'
                          {...registerRegister('otp', {
                            required: 'Vui lòng nhập mã OTP',
                            pattern: {
                              value: /^[0-9]{6}$/,
                              message: 'Mã OTP phải có 6 chữ số',
                            },
                          })}
                          placeholder='Nhập mã OTP 6 chữ số'
                          className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.otp ? 'border-destructive' : 'border-input'}`}

                          maxLength={6}
                        />
                        {registerErrors.otp && (
                          <p className='text-xs text-destructive'>
                            {registerErrors.otp.message}
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground'>
                          Vui lòng kiểm tra email để nhận mã OTP
                        </p>
                      </div>

                      {/* Full name */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-name'
                          className='text-sm font-medium text-foreground'
                        >
                          Họ tên (không bắt buộc)
                        </label>
                        <input
                          id='reg-name'
                          type='text'
                          {...registerRegister('name')}
                          placeholder='Nguyễn Thị Linh'
                          className='w-full h-11 px-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'

                          autoComplete='name'
                        />
                      </div>

                      {/* Password */}
                      <div className='space-y-1.5'>
                        <label
                          htmlFor='reg-password'
                          className='text-sm font-medium text-foreground'
                        >
                          Mật khẩu
                        </label>
                        <div className='relative'>
                          <input
                            id='reg-password'
                            type={regShowPw ? 'text' : 'password'}
                            {...registerRegister('password', {
                              required: 'Vui lòng nhập mật khẩu',
                              minLength: {
                                value: 8,
                                message:
                                  'Mật khẩu phải có ít nhất 8 ký tự',
                              },
                            })}
                            placeholder='Tối thiểu 8 ký tự'
                            className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${registerErrors.password ? 'border-destructive' : 'border-input'}`}

                            autoComplete='new-password'
                          />
                          <button
                            type='button'
                            onClick={() => setRegShowPw(!regShowPw)}
                            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                            aria-label={
                              regShowPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
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
                          Quay lại
                        </button>
                        <button
                          type='submit'
                          disabled={registerVerifyMutation.isPending}
                          className='flex-1 h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                          {registerVerifyMutation.isPending
                            ? 'Đang tạo…'
                            : 'Tạo tài khoản'}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                <p className='text-center text-sm text-muted-foreground mt-5'>
                  Đã có tài khoản?{' '}
                  <button
                    onClick={() => setTab('login')}
                    className='text-primary font-medium hover:underline'
                  >
                    Đăng nhập
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
