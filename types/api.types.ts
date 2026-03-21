/**
 * API Types & Models
 * Type definitions for API requests and responses
 */

// ============================================================================
// Enums
// ============================================================================

export type UserRole = 'ADMIN' | 'CUSTOMER';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';
export type MemberLevel = 'SILVER' | 'GOLD' | 'PLATINUM';
export type DiscountType = 'PERCENTAGE' | 'FIXED';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'MOMO' | 'ZALOPAY';
export type MenuType = 'CATEGORY' | 'PAGE' | 'LINK';
export type NotificationStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ProductAttributeType =
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN';

// ============================================================================
// Base Models
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  role: UserRole;
  emailVerifiedAt: string | null;
  isActive: boolean;
  memberLevel?: MemberLevel;
  points?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  level: number;
  displayOrder: number;
  isActive: boolean;
  showInMenu: boolean;
  createdAt: string;
  updatedAt: string;
  children?: Category[];
  _count?: {
    products: number;
  };
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  productId: string;
  categoryId: string;
  category?: Category;
  product?: Product;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number;
  trackStock: boolean;
  weight: number | null;
  images: ProductImage[];
  categories?: ProductCategory[];
  variants?: ProductVariant[];
  attributeAssignments?: ProductAttributeAssignment[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  code: string;
  type: ProductAttributeType;
  description: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isVariantAxis: boolean;
  isActive: boolean;
  displayOrder: number;
  values?: ProductAttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttributeValue {
  id: string;
  attributeId: string;
  value: string;
  slug: string;
  label: string;
  colorHex: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttributeAssignment {
  id: string;
  productId: string;
  attributeId: string;
  valueId: string | null;
  valueKey: string;
  textValue: string | null;
  numberValue: number | null;
  booleanValue: boolean | null;
  attribute?: ProductAttribute;
  value?: ProductAttributeValue | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilterValueOption extends ProductAttributeValue {
  productCount: number;
}

export interface ProductFilterGroup extends ProductAttribute {
  values: ProductFilterValueOption[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  name: string;
  product?: Product;
  variant?: ProductVariant;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  user?: User;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAddress: string | null;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod | null;
  orderItems: OrderItem[];
  payment?: Payment;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  transactionId: string | null;
  amount: number;
  status: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  user?: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product?: Product;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  title: string;
  url: string | null;
  parentId: string | null;
  categoryId: string | null;
  pageId: string | null;
  type: MenuType;
  displayOrder: number;
  isActive: boolean;
  children?: MenuItem[];
  category?: Category;
  page?: Page;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  status: NotificationStatus;
  publishedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListItem extends Notification {
  readCount?: number;
  isRead?: boolean;
  readAt?: string | null;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
}

export interface Cart {
  id: string;
  userId: string | null;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer extends User {
  orders?: Order[];
  totalOrders: number;
  totalSpent?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  kpi: {
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    totalCustomers: number;
    totalProducts: number;
  };
  chartData: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
  topProducts: Array<{
    productId: string;
    _sum: { quantity: number };
    product?: { id: string; name: string };
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    createdAt: string;
    itemsCount: number;
  }>;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface StoreSettings {
  store_name: string;
  store_email: string;
  store_phone: string;
  store_address: string;
  opening_hours: string;
  pickup_slots: string;
  allow_delivery: string;
  delivery_fee: string;
  min_order_delivery: string;
}

export interface MembershipConfig {
  levels: Array<{
    level: MemberLevel;
    label: string;
    minPoints: number;
    discountPercent: number;
    memberCount: number;
  }>;
  pointsPerOrder: number;
  totalMembers: number;
}

// ============================================================================
// Request Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
}

export interface RegisterVerifyRequest {
  email: string;
  otp: string;
  password: string;
  name?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordVerifyRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface CreateProductRequest {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  sku?: string;
  barcode?: string;
  stock: number;
  trackStock?: boolean;
  weight?: number;
  categoryIds?: string[];
  images?: (string | { url: string; isPrimary?: boolean; altText?: string; displayOrder?: number })[];
  variants?: Array<{
    name: string;
    sku?: string;
    price: number;
    stock?: number;
  }>;
  attributeAssignments?: ProductAttributeAssignmentInput[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

export interface ProductAttributeValueInput {
  label: string;
  value?: string;
  slug?: string;
  colorHex?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateProductAttributeRequest {
  name: string;
  slug: string;
  code: string;
  type: ProductAttributeType;
  description?: string;
  isRequired?: boolean;
  isFilterable?: boolean;
  isVariantAxis?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  values?: ProductAttributeValueInput[];
}

export type UpdateProductAttributeRequest =
  Partial<CreateProductAttributeRequest>;

export interface ProductAttributeAssignmentInput {
  attributeId: string;
  valueIds?: string[];
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  level?: number;
  displayOrder?: number;
  isActive?: boolean;
  showInMenu?: boolean;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export interface UpdateOrderRequest {
  status?: OrderStatus;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  memberLevel?: MemberLevel;
  points?: number;
  isActive?: boolean;
}

export interface CreateBannerRequest {
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateBannerRequest = Partial<CreateBannerRequest>;

export type UpdateSettingsRequest = Partial<StoreSettings>;

export interface UpdateMembershipRequest {
  levels?: Array<{
    level: MemberLevel;
    minPoints: number;
    discountPercent: number;
  }>;
  pointsPerOrder?: number;
}

export interface CreateAddressRequest {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault?: boolean;
}

export type UpdateAddressRequest = Partial<CreateAddressRequest>;

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface CreateCouponRequest {
  code: string;
  type: DiscountType;
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  startAt: string;
  endAt: string;
  usageLimit?: number;
  isActive?: boolean;
}

export type UpdateCouponRequest = Partial<CreateCouponRequest>;

export interface CreateMenuItemRequest {
  title: string;
  url?: string;
  parentId?: string;
  categoryId?: string;
  pageId?: string;
  type?: MenuType;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateMenuItemRequest = Partial<CreateMenuItemRequest>;

export interface CreatePageRequest {
  title: string;
  slug: string;
  content: string;
  isPublished?: boolean;
}

export type UpdatePageRequest = Partial<CreatePageRequest>;

export interface CreateNotificationRequest {
  title: string;
  content: string;
  imageUrl?: string;
  linkUrl?: string;
  status?: NotificationStatus;
  publishedAt?: string;
}

export type UpdateNotificationRequest = Partial<CreateNotificationRequest>;

// ============================================================================
// Query Params Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProductsQueryParams extends PaginationParams {
  category?: string;
  categoryId?: string;
  search?: string;
  featured?: boolean;
  active?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  attributeFilters?: Array<{
    attributeSlug: string;
    valueSlugs: string[];
  }>;
}

export interface OrdersQueryParams extends PaginationParams {
  status?: OrderStatus;
  userId?: string;
  search?: string;
}

export interface CustomersQueryParams extends PaginationParams {
  search?: string;
  level?: MemberLevel;
}

export interface AdminNotificationsQueryParams extends PaginationParams {
  search?: string;
  status?: NotificationStatus;
}

export interface UserNotificationsQueryParams extends PaginationParams {
  unreadOnly?: boolean;
}

// Enum
export type BlogPostStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// Models
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { posts: number };
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  authorId: string;
  author?: Pick<User, 'id' | 'name'>;
  categoryId: string | null;
  category?: BlogCategory | null;
  tags?: BlogTag[];
  status: BlogPostStatus;
  publishedAt: string | null;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

// Requests
export interface CreateBlogPostRequest {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverUrl?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: BlogPostStatus;
  publishedAt?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export type UpdateBlogPostRequest = Partial<CreateBlogPostRequest>;

export interface CreateBlogCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateBlogCategoryRequest = Partial<CreateBlogCategoryRequest>;

export interface CreateBlogTagRequest {
  name: string;
  slug: string;
}

export type UpdateBlogTagRequest = Partial<CreateBlogTagRequest>;

// Query Params
export interface BlogPostsQueryParams extends PaginationParams {
  search?: string;
  status?: BlogPostStatus;
  categoryId?: string;
  categorySlug?: string;
  tagId?: string;
  tagSlug?: string;
}
