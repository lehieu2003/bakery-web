'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from '@/hooks/use-auth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useLogin();
  const error = loginMutation.error?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <div className='w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md'>
            <span className='font-serif text-primary-foreground text-xl font-bold'>
              L
            </span>
          </div>
          <h1 className='font-serif text-2xl font-semibold text-foreground tracking-wide'>
            La Douceur
          </h1>
          <p className='text-xs text-muted-foreground mt-1 uppercase tracking-widest'>
            Admin Panel
          </p>
        </div>

        {/* Card */}
        <div className='bg-card rounded-2xl border border-border shadow-sm p-6'>
          <h2 className='font-serif text-lg font-semibold text-foreground mb-1'>
            Sign in
          </h2>
          <p className='text-xs text-muted-foreground mb-6'>
            Access your bakery management dashboard
          </p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {error && (
              <div className='bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5'>
                <p className='text-xs text-destructive'>{error}</p>
              </div>
            )}

            <div className='space-y-1.5'>
              <Label htmlFor='email' className='text-xs font-medium'>
                Email
              </Label>
              <div className='relative'>
                <Mail
                  size={14}
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
                />
                <Input
                  id='email'
                  type='email'
                  placeholder='admin@ladouceur.vn'
                  className='pl-9 h-10 text-sm'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='password' className='text-xs font-medium'>
                Password
              </Label>
              <div className='relative'>
                <Lock
                  size={14}
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
                />
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='••••••••'
                  className='pl-9 pr-9 h-10 text-sm'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <Button
              type='submit'
              className='w-full h-10 text-sm font-medium mt-2'
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className='flex items-center gap-2'>
                  <svg
                    className='animate-spin h-3.5 w-3.5'
                    viewBox='0 0 24 24'
                    fill='none'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className='text-[10px] text-muted-foreground text-center mt-4'>
            Demo: admin@bakeryshop.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
