/**
 * Authentication Hook
 * React Query hook for authentication
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import type {
  LoginRequest,
  RegisterRequest,
  RegisterVerifyRequest,
  ResetPasswordRequest,
  ResetPasswordVerifyRequest,
} from '@/types/api.types';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

/**
 * Hook to get current user
 */
export function useUser() {
  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authService.me(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for login
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user(), user);
      // Redirect based on role
      if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    },
  });
}

/**
 * Hook for logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear(); // Clear all cached data
      router.push('/login');
    },
  });
}

/**
 * Hook for registration (send OTP)
 */
export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
  });
}

/**
 * Hook for registration verification
 */
export function useRegisterVerify() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterVerifyRequest) =>
      authService.registerVerify(data),
    onSuccess: (response) => {
      queryClient.setQueryData(authKeys.user(), response.user);
      router.push('/');
    },
  });
}

/**
 * Hook for password reset (send OTP)
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authService.resetPassword(data),
  });
}

/**
 * Hook for password reset verification
 */
export function useResetPasswordVerify() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: ResetPasswordVerifyRequest) =>
      authService.resetPasswordVerify(data),
    onSuccess: () => {
      router.push('/login');
    },
  });
}
