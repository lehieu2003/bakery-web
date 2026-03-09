/**
 * HTTP Client with Interceptors
 * Professional API client for frontend
 */

import { toast } from 'sonner';
import { authToken } from '@/lib/auth-token';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  skipAuthRedirect?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: ApiResponse,
  ) {
    super(data?.error || statusText);
    this.name = 'ApiError';
  }
}

// ============================================================================
// Interceptors
// ============================================================================

type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

export const interceptors = {
  request: {
    use: (interceptor: RequestInterceptor) => {
      requestInterceptors.push(interceptor);
      return () => {
        const index = requestInterceptors.indexOf(interceptor);
        if (index > -1) requestInterceptors.splice(index, 1);
      };
    },
  },
  response: {
    use: (interceptor: ResponseInterceptor) => {
      responseInterceptors.push(interceptor);
      return () => {
        const index = responseInterceptors.indexOf(interceptor);
        if (index > -1) responseInterceptors.splice(index, 1);
      };
    },
  },
  error: {
    use: (interceptor: ErrorInterceptor) => {
      errorInterceptors.push(interceptor);
      return () => {
        const index = errorInterceptors.indexOf(interceptor);
        if (index > -1) errorInterceptors.splice(index, 1);
      };
    },
  },
};

// ============================================================================
// Default Interceptors
// ============================================================================

// Add default headers and auth token
interceptors.request.use((config) => {
  const token = authToken.get();

  config.headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...config.headers,
  };
  return config;
});

// Store config for error interceptor to access
let currentRequestConfig: RequestConfig | null = null;

// Handle 401 Unauthorized - redirect to login
interceptors.error.use(async (error) => {
  if (error.status === 401) {
    // Don't redirect if skipAuthRedirect flag is set (e.g., during login)
    if (currentRequestConfig?.skipAuthRedirect) {
      return error;
    }

    // Only redirect if we're in the browser and not already on auth page
    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/auth')
    ) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }
  return error;
});

// Handle 403 Forbidden
interceptors.error.use(async (error) => {
  if (error.status === 403) {
    toast.error('Bạn không có quyền truy cập chức năng này');
  }
  return error;
});

// ============================================================================
// Core HTTP Methods
// ============================================================================

async function request<T>(
  url: string,
  config: RequestConfig = {},
): Promise<ApiResponse<T>> {
  const {
    params,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    skipAuthRedirect,
    ...fetchConfig
  } = config;

  // Store config for error interceptor
  currentRequestConfig = config;

  // Build URL with query params
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
    }
  }

  // Apply request interceptors
  let finalConfig: RequestConfig = { ...fetchConfig };
  for (const interceptor of requestInterceptors) {
    finalConfig = await interceptor(finalConfig);
  }

  try {
    let response = await fetch(fullUrl, {
      ...finalConfig,
      credentials: 'include', // Always include cookies for session
    });

    // Apply response interceptors
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response);
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      let error = new ApiError(response.status, response.statusText, data);

      // Apply error interceptors
      for (const interceptor of errorInterceptors) {
        error = await interceptor(error);
      }

      if (showErrorToast) {
        toast.error(data.error || 'Đã có lỗi xảy ra');
      }

      throw error;
    }

    if (showSuccessToast && data.success) {
      toast.success(successMessage || data.message || 'Thành công!');
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error or other unexpected error
    const networkError = new ApiError(0, 'Network Error', {
      success: false,
      error: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
    });

    if (showErrorToast) {
      toast.error('Không thể kết nối đến server');
    }

    throw networkError;
  }
}

// ============================================================================
// HTTP Method Helpers
// ============================================================================

export const http = {
  get: <T>(url: string, config?: RequestConfig) =>
    request<T>(url, { ...config, method: 'GET' }),

  post: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(url: string, data?: unknown, config?: RequestConfig) =>
    request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(url: string, config?: RequestConfig) =>
    request<T>(url, { ...config, method: 'DELETE' }),
};

export default http;
