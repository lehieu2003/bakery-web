'use client';

import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { useApp } from '@/lib/store';

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const { login, navigate } = useApp();
  const [tab, setTab] = useState<Tab>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regShowPw, setRegShowPw] = useState(false);
  const [regShowConfirm, setRegShowConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [agreed, setAgreed] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please fill in all fields.');
      return;
    }
    setLoginError('');
    login();
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!regName.trim()) errors.name = 'Full name is required.';
    if (!regEmail.trim()) errors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(regEmail))
      errors.email = 'Enter a valid email.';
    if (!regPassword) errors.password = 'Password is required.';
    else if (regPassword.length < 8) errors.password = 'Minimum 8 characters.';
    if (regConfirm !== regPassword) errors.confirm = 'Passwords do not match.';
    if (!agreed) errors.agreed = 'You must agree to the terms.';

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});
    login();
  }

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
        <button
          onClick={() => navigate('home')}
          className='flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors'
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

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

                <form onSubmit={handleLogin} noValidate className='space-y-5'>
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
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder='hello@example.com'
                      className='w-full h-11 px-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
                      autoComplete='email'
                    />
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
                        className='text-xs text-primary hover:underline'
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className='relative'>
                      <input
                        id='login-password'
                        type={loginShowPw ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder='Enter your password'
                        className='w-full h-11 px-4 pr-11 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all'
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
                        {loginShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {loginError && (
                    <p className='text-xs text-destructive'>{loginError}</p>
                  )}

                  <button
                    type='submit'
                    className='w-full h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all'
                  >
                    Sign In
                  </button>
                </form>

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
                      <span className='w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0'>
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
                  onSubmit={handleRegister}
                  noValidate
                  className='space-y-4'
                >
                  {/* Full name */}
                  <div className='space-y-1.5'>
                    <label
                      htmlFor='reg-name'
                      className='text-sm font-medium text-foreground'
                    >
                      Full Name
                    </label>
                    <input
                      id='reg-name'
                      type='text'
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder='Nguyen Thi Linh'
                      className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${regErrors.name ? 'border-destructive' : 'border-input'}`}
                      autoComplete='name'
                    />
                    {regErrors.name && (
                      <p className='text-xs text-destructive'>
                        {regErrors.name}
                      </p>
                    )}
                  </div>

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
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder='hello@example.com'
                      className={`w-full h-11 px-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${regErrors.email ? 'border-destructive' : 'border-input'}`}
                      autoComplete='email'
                    />
                    {regErrors.email && (
                      <p className='text-xs text-destructive'>
                        {regErrors.email}
                      </p>
                    )}
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
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder='Minimum 8 characters'
                        className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${regErrors.password ? 'border-destructive' : 'border-input'}`}
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
                        {regShowPw ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    {regErrors.password && (
                      <p className='text-xs text-destructive'>
                        {regErrors.password}
                      </p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className='space-y-1.5'>
                    <label
                      htmlFor='reg-confirm'
                      className='text-sm font-medium text-foreground'
                    >
                      Confirm Password
                    </label>
                    <div className='relative'>
                      <input
                        id='reg-confirm'
                        type={regShowConfirm ? 'text' : 'password'}
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        placeholder='Re-enter your password'
                        className={`w-full h-11 px-4 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all ${regErrors.confirm ? 'border-destructive' : 'border-input'}`}
                        autoComplete='new-password'
                      />
                      <button
                        type='button'
                        onClick={() => setRegShowConfirm(!regShowConfirm)}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
                        aria-label={
                          regShowConfirm ? 'Hide password' : 'Show password'
                        }
                      >
                        {regShowConfirm ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                    {regErrors.confirm && (
                      <p className='text-xs text-destructive'>
                        {regErrors.confirm}
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
                        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors ${agreed ? 'bg-primary border-primary' : 'border-input'}`}
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
                        <span className='text-primary'>Terms of Service</span>{' '}
                        and <span className='text-primary'>Privacy Policy</span>
                      </span>
                    </label>
                    {regErrors.agreed && (
                      <p className='text-xs text-destructive pl-7'>
                        {regErrors.agreed}
                      </p>
                    )}
                  </div>

                  <button
                    type='submit'
                    className='w-full h-11 rounded-full bg-primary text-white text-sm font-semibold tracking-wide shadow-sm hover:opacity-90 active:scale-[0.98] transition-all mt-2'
                  >
                    Create Account
                  </button>
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
