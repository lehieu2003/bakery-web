/**
 * Admin Services
 * Re-export all admin service modules
 */

export { productsService } from './products.service';
export { productAttributesService } from './product-attributes.service';
export { categoriesService } from './categories.service';
export { ordersService } from './orders.service';
export { customersService } from './customers.service';
export { bannersService } from './banners.service';
export { dashboardService } from './dashboard.service';
export { settingsService } from './settings.service';
export { membershipService } from './membership.service';
export { blogPostsService } from './blog-posts.service';
export { blogCategoriesService } from './blog-categories.service';
export { blogTagsService } from './blog-tags.service';
export { notificationsService } from './notifications.service';
export { auditService } from './audit.service';

// Default export as namespace
import { productsService } from './products.service';
import { productAttributesService } from './product-attributes.service';
import { categoriesService } from './categories.service';
import { ordersService } from './orders.service';
import { customersService } from './customers.service';
import { bannersService } from './banners.service';
import { dashboardService } from './dashboard.service';
import { settingsService } from './settings.service';
import { membershipService } from './membership.service';
import { blogPostsService } from './blog-posts.service';
import { blogCategoriesService } from './blog-categories.service';
import { blogTagsService } from './blog-tags.service';
import { notificationsService } from './notifications.service';
import { auditService } from './audit.service';

const adminServices = {
  products: productsService,
  productAttributes: productAttributesService,
  categories: categoriesService,
  orders: ordersService,
  customers: customersService,
  banners: bannersService,
  dashboard: dashboardService,
  settings: settingsService,
  membership: membershipService,
  blogPosts: blogPostsService,
  blogCategories: blogCategoriesService,
  blogTags: blogTagsService,
  notifications: notificationsService,
  audit: auditService,
};

export default adminServices;
