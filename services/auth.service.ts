/**
 * Authentication Service
 * Login, register, logout, password reset
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import { authToken } from '@/lib/auth-token';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  RegisterVerifyRequest,
  ResetPasswordRequest,
  ResetPasswordVerifyRequest,
} from '@/types/api.types';

export const authService = {
  /**
   * Login with email and password
   */
  login: async (data: LoginRequest) => {
    const response = await http.post<{ user: User; token: string }>(
      ENDPOINTS.AUTH.LOGIN,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Đăng nhập thành công!',
        skipAuthRedirect: true, // Don't redirect on 401 - let form handle it
      },
    );

    // Store token in localStorage
    if (response.data?.token) {
      console.log('Received user data:', response.data); // Debug log
      authToken.set({
        token: response.data.token,
        role: response.data.user.role,
      });
    }

    return response.data!.user;
  },

  /**
   * Logout current session
   */
  logout: async () => {
    const response = await http.post<{ message: string }>(
      ENDPOINTS.AUTH.LOGOUT,
      undefined,
      {
        showSuccessToast: true,
        successMessage: 'Đăng xuất thành công!',
      },
    );

    // Remove token from localStorage
    authToken.remove();

    return response.data!;
  },

  /**
   * Get current user
   */
  me: async () => {
    const response = await http.get<{ user: User }>(ENDPOINTS.AUTH.ME, {
      showErrorToast: false, // Don't show error toast for unauthenticated users
      skipAuthRedirect: true, // Don't redirect when checking auth status
    });
    return response.data!.user;
  },

  /**
   * Send OTP for registration
   */
  register: async (data: RegisterRequest) => {
    const response = await http.post<{ message: string }>(
      ENDPOINTS.AUTH.REGISTER,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Mã OTP đã được gửi đến email của bạn!',
        skipAuthRedirect: true,
      },
    );
    return response.data!;
  },

  /**
   * Verify OTP and complete registration
   */
  registerVerify: async (data: RegisterVerifyRequest) => {
    const response = await http.post<{ user: User; token: string } | User>(
      ENDPOINTS.AUTH.REGISTER_VERIFY,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Đăng ký tài khoản thành công!',
        skipAuthRedirect: true,
      },
    );

    const responseData = response.data!;

    // Store token if present
    if (
      responseData &&
      typeof responseData === 'object' &&
      'token' in responseData
    ) {
      authToken.set({
        token: (responseData as { token: string }).token,
      });
      return responseData.user;
    }

    // Handle both formats: { user: User } or User directly
    if (
      responseData &&
      typeof responseData === 'object' &&
      'id' in responseData
    ) {
      // It's a User object
      return responseData as User;
    } else if (
      responseData &&
      typeof responseData === 'object' &&
      'user' in responseData
    ) {
      // It's wrapped in { user: User }
      return (responseData as { user: User }).user;
    }
    return responseData as User;
  },

  /**
   * Send OTP for password reset
   */
  resetPassword: async (data: ResetPasswordRequest) => {
    const response = await http.post<{ message: string }>(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Mã OTP đã được gửi đến email của bạn!',
        skipAuthRedirect: true,
      },
    );
    return response.data!;
  },

  /**
   * Verify OTP and reset password
   */
  resetPasswordVerify: async (data: ResetPasswordVerifyRequest) => {
    const response = await http.post<{ message: string }>(
      ENDPOINTS.AUTH.RESET_PASSWORD_VERIFY,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Đặt lại mật khẩu thành công!',
        skipAuthRedirect: true,
      },
    );
    return response.data!;
  },
};

export default authService;
