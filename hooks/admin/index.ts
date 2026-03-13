/**
 * Admin Hooks Index
 * Re-export all admin hooks
 */

// Products
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  productKeys,
} from './use-products';

// Categories
export {
  useCategories,
  useCategory,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  categoryKeys,
} from './use-categories';

// Orders
export {
  useOrders,
  useOrder,
  useUpdateOrder,
  useUpdateOrderStatus,
  orderKeys,
} from './use-orders';

// Customers
export {
  useCustomers,
  useCustomer,
  useUpdateCustomer,
  customerKeys,
} from './use-customers';

// Banners
export {
  useBanners,
  useBanner,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  bannerKeys,
} from './use-banners';

// Dashboard
export { useDashboard, dashboardKeys } from './use-dashboard';

// Settings
export { useSettings, useUpdateSettings, settingsKeys } from './use-settings';

// Membership
export {
  useMembership,
  useUpdateMembership,
  membershipKeys,
} from './use-membership';

// Notifications
export {
  useNotifications,
  useNotification,
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
  notificationKeys,
} from './use-notifications';
