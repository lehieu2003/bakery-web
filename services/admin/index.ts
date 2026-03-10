/**
 * Admin Services
 * Re-export all admin service modules
 */

export { productsService } from './products.service';
export { categoriesService } from './categories.service';
export { ordersService } from './orders.service';
export { customersService } from './customers.service';
export { bannersService } from './banners.service';
export { dashboardService } from './dashboard.service';
export { settingsService } from './settings.service';
export { membershipService } from './membership.service';
export { pagesService } from './pages.service';
export { menuService } from './menu.service';

// Default export as namespace
import { productsService } from './products.service';
import { categoriesService } from './categories.service';
import { ordersService } from './orders.service';
import { customersService } from './customers.service';
import { bannersService } from './banners.service';
import { dashboardService } from './dashboard.service';
import { settingsService } from './settings.service';
import { membershipService } from './membership.service';
import { pagesService } from './pages.service';
import { menuService } from './menu.service';

const adminServices = {
  products: productsService,
  categories: categoriesService,
  orders: ordersService,
  customers: customersService,
  banners: bannersService,
  dashboard: dashboardService,
  settings: settingsService,
  membership: membershipService,
  pages: pagesService,
  menu: menuService,
};

export default adminServices;
