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
  LoginVerifyRequest,
  RegisterRequest,
  RegisterVerifyRequest,
  ResetPasswordRequest,
  ResetPasswordVerifyRequest,
  UpdateProfileRequest,
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
 * Hook for updating current user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => authService.updateProfile(data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user(), user);
    },
  });
}

/**
 * Hook for login
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authService.login(data),
    onSuccess: (result) => {
      if (result.kind === 'signedIn') {
        queryClient.setQueryData(authKeys.user(), result.user);
      }
      // Don't auto-redirect here - let the component handle navigation
    },
  });
}

/**
 * Hook for the emailed-code step of an admin sign-in on a new device
 */
export function useVerifyLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginVerifyRequest) => authService.verifyLogin(data),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.user(), user);
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
      router.push('/');
    },
  });
}

/**
 * Hook for account deletion — on success the session is gone server-side,
 * so local auth state is dropped the same way as logout.
 */
export function useRequestDeleteAccountOtp() {
  return useMutation({
    mutationFn: () => authService.requestDeleteAccountOtp(),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (otp: string) => authService.deleteAccount(otp),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.user(), null);
      queryClient.clear();
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

  return useMutation({
    mutationFn: (data: RegisterVerifyRequest) =>
      authService.registerVerify(data),
    onSuccess: (user) => {
      console.log('Registration response:', user);
      queryClient.setQueryData(authKeys.user(), user);
      // Don't auto-redirect here - let the component handle navigation
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
      router.push('/auth');
    },
  });
}
