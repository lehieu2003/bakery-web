/**
 * API Types & Models
 * Type definitions for API requests and responses
 */

// ============================================================================
// Enums
// ============================================================================

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'GUEST';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';
export type MemberLevel = 'SILVER' | 'GOLD' | 'PLATINUM';
export type BannerPlacement = 'HOME_HERO' | 'HOME_PROMO' | 'CATEGORY';
export type DiscountType = 'PERCENTAGE' | 'FIXED';

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

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  // Legacy fields kept for backward compatibility during migration
  imageUrl?: string | null;
  images: ProductImage[] | string[];
  stock: number;
  categoryId: string;
  category?: Category;
  variants?: ProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
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
  customerNote: string | null;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  orderItems: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  placement: BannerPlacement;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  createdAt: string;
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
  price: number;
  comparePrice?: number;
  stock: number;
  categoryId?: string;
  imageUrl?: string;
  images?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  level?: number;
  displayOrder?: number;
  isActive?: boolean;
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
  imageUrl: string;
  linkUrl?: string;
  placement: BannerPlacement;
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
  startAt: string;
  endAt: string;
  usageLimit?: number;
}

export type UpdateCouponRequest = Partial<CreateCouponRequest>;

// ============================================================================
// Query Params Types
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface ProductsQueryParams extends PaginationParams {
  category?: string;
  search?: string;
  featured?: boolean;
  active?: boolean;
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
