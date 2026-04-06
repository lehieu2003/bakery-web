/**
 * Hooks Index
 * Central export for all hooks
 */

// Auth hooks
export {
  useUser,
  useLogin,
  useLogout,
  useRegister,
  useRegisterVerify,
  useResetPassword,
  useResetPasswordVerify,
  authKeys,
} from './use-auth';

// Product hooks
export {
  useProducts,
  useProductDetail,
  useCategories,
  productKeys,
} from './use-products';

// UI hooks
export { useIsMobile } from './use-mobile';
export { useToast, toast } from './use-toast';
export {
  useUserNotifications,
  useInfiniteUserNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  userNotificationKeys,
} from './use-notifications';
export {
  useWishlist,
  useAddToWishlist,
  useRemoveFromWishlist,
  useToggleWishlist,
  wishlistKeys,
} from './use-wishlist';

// Admin hooks - re-export from admin folder
export * from './admin';

export {
  useMembershipBenefits,
  membershipBenefitsKeys,
} from './use-membership-benefits';

