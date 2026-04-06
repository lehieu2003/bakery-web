/**
 * Services Index
 * Central export for all services
 */

// Auth
export { authService } from './auth.service';

// Public Services
export { productService } from './product.service';
export { notificationsService } from './notifications.service';
export { wishlistService } from './wishlist.service';
export { membershipBenefitsService } from './membership-benefits.service';
export { incentiveDiscoveryService } from './incentive-discovery.service';

// Admin Services
export {
  productsService,
  categoriesService,
  ordersService,
  customersService,
  bannersService,
  dashboardService,
  settingsService,
  membershipService,
} from './admin';

// Admin namespace
export { default as adminServices } from './admin';

