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
  UpdateProfileRequest,
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

    // Session persists via the HttpOnly `bakery_session` cookie set by the
    // server (Set-Cookie). The token in the response body is for non-browser
    // (mobile Bearer) clients only — the browser never stores it.
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

    // Server clears the HttpOnly `bakery_session` cookie in its response.

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
   * Update current user profile
   */
  updateProfile: async (data: UpdateProfileRequest) => {
    const response = await http.patch<{ user: User }>(ENDPOINTS.AUTH.ME, data, {
      showSuccessToast: true,
      successMessage: 'Cập nhật hồ sơ thành công!',
      skipAuthRedirect: true,
    });

    return response.data!.user;
  },

  /**
   * Permanently delete (anonymize) the current account. The server revokes
   * every session and clears the session cookie.
   */
  deleteAccount: async (password: string) => {
    await http.post<{ deleted: boolean }>(
      ENDPOINTS.AUTH.DELETE_ACCOUNT,
      { password },
      {
        showErrorToast: false, // the form shows the reason inline
        skipAuthRedirect: true,
      },
    );
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

    if (
      responseData &&
      typeof responseData === 'object' &&
      'token' in responseData
    ) {
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
