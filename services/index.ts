/**
 * Services Index
 * Central export for all services
 */

// Auth
export { authService } from './auth.service';

// Public Services
export { productService } from './product.service';

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
