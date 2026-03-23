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

    PRODUCT_ATTRIBUTES: {
      LIST: `${ADMIN_BASE}/product-attributes`,
      DETAIL: (id: string) => `${ADMIN_BASE}/product-attributes/${id}`,
      CREATE: `${ADMIN_BASE}/product-attributes`,
      UPDATE: (id: string) => `${ADMIN_BASE}/product-attributes/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/product-attributes/${id}`,
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

    // Blog Posts
    BLOG_POSTS: {
      LIST: `${ADMIN_BASE}/blog/posts`,
      DETAIL: (id: string) => `${ADMIN_BASE}/blog/posts/${id}`,
      CREATE: `${ADMIN_BASE}/blog/posts`,
      UPDATE: (id: string) => `${ADMIN_BASE}/blog/posts/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/blog/posts/${id}`,
      UPDATE_STATUS: (id: string) => `${ADMIN_BASE}/blog/posts/${id}/status`,
    },

    // Blog Categories
    BLOG_CATEGORIES: {
      LIST: `${ADMIN_BASE}/blog/categories`,
      DETAIL: (id: string) => `${ADMIN_BASE}/blog/categories/${id}`,
      CREATE: `${ADMIN_BASE}/blog/categories`,
      UPDATE: (id: string) => `${ADMIN_BASE}/blog/categories/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/blog/categories/${id}`,
    },

    // Blog Tags
    BLOG_TAGS: {
      LIST: `${ADMIN_BASE}/blog/tags`,
      DETAIL: (id: string) => `${ADMIN_BASE}/blog/tags/${id}`,
      CREATE: `${ADMIN_BASE}/blog/tags`,
      UPDATE: (id: string) => `${ADMIN_BASE}/blog/tags/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/blog/tags/${id}`,
    },

    // Notifications
    NOTIFICATIONS: {
      LIST: `${ADMIN_BASE}/notifications`,
      DETAIL: (id: string) => `${ADMIN_BASE}/notifications/${id}`,
      CREATE: `${ADMIN_BASE}/notifications`,
      UPDATE: (id: string) => `${ADMIN_BASE}/notifications/${id}`,
      DELETE: (id: string) => `${ADMIN_BASE}/notifications/${id}`,
    },
  },

  // ============================================================================
  // Public APIs
  // ============================================================================
  PUBLIC: {
    PRODUCTS: `${API_BASE}/public/products`,
    PRODUCT_FILTERS: `${API_BASE}/public/products/filters`,
    PRODUCT_DETAIL: (idOrSlug: string) =>
      `${API_BASE}/public/products/${idOrSlug}`,
    RELATED_PRODUCTS: (idOrSlug: string) =>
      `${API_BASE}/public/products/${idOrSlug}/related`,
    BEST_SELLERS: `${API_BASE}/public/products/best-sellers`,
    CATEGORIES: `${API_BASE}/public/categories`,
    BANNERS: `${API_BASE}/public/banners`,
    PAGES: `${API_BASE}/public/pages`,
    PAGE_DETAIL: (slug: string) => `${API_BASE}/public/pages/${slug}`,
    MENU: `${API_BASE}/public/menu`,

    // Blog
    BLOG_POSTS: `${API_BASE}/blog/posts`,
    BLOG_POST_DETAIL: (slug: string) => `${API_BASE}/blog/posts/${slug}`,
    BLOG_CATEGORIES: `${API_BASE}/blog/categories`,
    BLOG_TAGS: `${API_BASE}/blog/tags`,
  },

  // ============================================================================
  // Customer APIs
  // ============================================================================
  ORDERS: `${API_BASE}/orders`,
  NOTIFICATIONS: {
    LIST: `${API_BASE}/notifications`,
    MARK_READ: (id: string) => `${API_BASE}/notifications/${id}/read`,
    MARK_ALL_READ: `${API_BASE}/notifications/read-all`,
  },
  WISHLIST: {
    LIST: `${API_BASE}/wishlist`,
    ADD: `${API_BASE}/wishlist`,
    REMOVE: `${API_BASE}/wishlist`,
  },

  // ============================================================================
  // Chatbot API
  CHATBOT: `${API_BASE}/chat`,
} as const;

export default ENDPOINTS;
