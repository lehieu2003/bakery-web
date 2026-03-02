/**
 * Authentication Service
 * Login, register, logout, password reset
 */

import http from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
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
    const response = await http.post<{ user: User }>(
      ENDPOINTS.AUTH.LOGIN,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Đăng nhập thành công!',
      },
    );
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
    return response.data!;
  },

  /**
   * Get current user
   */
  me: async () => {
    const response = await http.get<{ user: User }>(ENDPOINTS.AUTH.ME, {
      showErrorToast: false, // Don't show error toast for unauthenticated users
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
      },
    );
    return response.data!;
  },

  /**
   * Verify OTP and complete registration
   */
  registerVerify: async (data: RegisterVerifyRequest) => {
    const response = await http.post<{ user: User; message: string }>(
      ENDPOINTS.AUTH.REGISTER_VERIFY,
      data,
      {
        showSuccessToast: true,
        successMessage: 'Đăng ký thành công!',
      },
    );
    return response.data!;
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
      },
    );
    return response.data!;
  },
};

export default authService;
