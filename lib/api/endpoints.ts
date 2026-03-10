/**
 * API Endpoints Configuration
 * Centralized endpoint management for scalability
 */

const API_BASE = '/api';
const ADMIN_BASE = `${API_BASE}/admin`;

export const ENDPOINTS = {
  // ============================================================================
  // Authentication
  // ============================================================================
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    LOGOUT: `${API_BASE}/auth/logout`,
    ME: `${API_BASE}/auth/me`,
    REGISTER: `${API_BASE}/auth/register`,
    REGISTER_VERIFY: `${API_BASE}/auth/register/verify`,
    RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
    RESET_PASSWORD_VERIFY: `${API_BASE}/auth/reset-password/verify`,
  },

  // ============================================================================
  // Admin APIs
  // ============================================================================
  ADMIN: {
    // Dashboard
    DASHBOARD: `${ADMIN_BASE}/dashboard`,

    // Products
    PRODUCTS: {
      LIST: `${ADMIN_BASE}/products`,
      DETAIL: (id: string) => `${ADMIN_BASE}/products/${id}`,
      CREATE: `${ADMIN_BASE}/products`,
      UPDATE: (id: string) => `${ADMIN_BASE}/products/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/products/${id}`,
    },

    // Categories
    CATEGORIES: {
      LIST: `${ADMIN_BASE}/categories`,
      DETAIL: (id: string) => `${ADMIN_BASE}/categories/${id}`,
      CREATE: `${ADMIN_BASE}/categories`,
      UPDATE: (id: string) => `${ADMIN_BASE}/categories/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/categories/${id}`,
    },

    // Orders
    ORDERS: {
      LIST: `${ADMIN_BASE}/orders`,
      DETAIL: (id: string) => `${ADMIN_BASE}/orders/${id}`,
      UPDATE: (id: string) => `${ADMIN_BASE}/orders/${id}`,
      UPDATE_STATUS: (id: string) => `${ADMIN_BASE}/orders/${id}/status`,
    },

    // Customers
    CUSTOMERS: {
      LIST: `${ADMIN_BASE}/customers`,
      DETAIL: (id: string) => `${ADMIN_BASE}/customers/${id}`,
      UPDATE: (id: string) => `${ADMIN_BASE}/customers/${id}`,
    },

    // Banners
    BANNERS: {
      LIST: `${ADMIN_BASE}/banners`,
      DETAIL: (id: string) => `${ADMIN_BASE}/banners/${id}`,
      CREATE: `${ADMIN_BASE}/banners`,
      UPDATE: (id: string) => `${ADMIN_BASE}/banners/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/banners/${id}`,
    },

    // Settings
    SETTINGS: `${ADMIN_BASE}/settings`,

    // Membership
    MEMBERSHIP: `${ADMIN_BASE}/membership`,

    // Pages
    PAGES: {
      LIST: `${ADMIN_BASE}/pages`,
      DETAIL: (id: string) => `${ADMIN_BASE}/pages/${id}`,
      CREATE: `${ADMIN_BASE}/pages`,
      UPDATE: (id: string) => `${ADMIN_BASE}/pages/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/pages/${id}`,
    },

    // Menu Items
    MENU: {
      LIST: `${ADMIN_BASE}/menu`,
      DETAIL: (id: string) => `${ADMIN_BASE}/menu/${id}`,
      CREATE: `${ADMIN_BASE}/menu`,
      UPDATE: (id: string) => `${ADMIN_BASE}/menu/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/menu/${id}`,
    },
  },

  // ============================================================================
  // Public APIs
  // ============================================================================
  PUBLIC: {
    PRODUCTS: `${API_BASE}/public/products`,
    PRODUCT_DETAIL: (idOrSlug: string) =>
      `${API_BASE}/public/products/${idOrSlug}`,
    CATEGORIES: `${API_BASE}/public/categories`,
    BANNERS: `${API_BASE}/public/banners`,
    PAGES: `${API_BASE}/public/pages`,
    PAGE_DETAIL: (slug: string) => `${API_BASE}/public/pages/${slug}`,
    MENU: `${API_BASE}/public/menu`,
  },

  // ============================================================================
  // Customer APIs
  // ============================================================================
  ORDERS: `${API_BASE}/orders`,
} as const;

export default ENDPOINTS;
