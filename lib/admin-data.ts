// ---- Types ----

export type ProductType = 'CAKE' | 'INGREDIENT';
export type ProductStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAID';
export type FulfillmentType = 'PICKUP' | 'DELIVERY';
export type BannerPlacement = 'HOME_HERO' | 'HOME_PROMO' | 'CATEGORY';
export type MemberLevel = 'SILVER' | 'GOLD' | 'PLATINUM';

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  productCount: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: ProductType;
  category: string;
  price: number;
  status: ProductStatus;
  thumbnail: string;
  updatedAt: string;
  description?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  thumbnail: string;
  quantity: number;
  unitPrice: number;
  options?: Record<string, string>;
}

export interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  phone: string;
  total: number;
  subtotal: number;
  discount: number;
  status: OrderStatus;
  fulfillment: FulfillmentType;
  pickupAt?: string;
  address?: string;
  note?: string;
  paymentMethod: string;
  paid: boolean;
  createdAt: string;
  items: OrderItem[];
}

export interface Banner {
  id: string;
  title: string;
  placement: BannerPlacement;
  image: string;
  ctaText: string;
  ctaLink: string;
  priority: number;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: MemberLevel;
  points: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

// ---- Mock Data ----

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Birthday Cakes', slug: 'birthday-cakes', type: 'CAKE', productCount: 12 },
  { id: 'c2', name: 'Wedding Cakes', slug: 'wedding-cakes', type: 'CAKE', productCount: 8 },
  { id: 'c3', name: 'Seasonal', slug: 'seasonal', type: 'CAKE', productCount: 5 },
  { id: 'c4', name: 'Flour & Baking', slug: 'flour-baking', type: 'INGREDIENT', productCount: 18 },
  { id: 'c5', name: 'Chocolate & Cocoa', slug: 'chocolate-cocoa', type: 'INGREDIENT', productCount: 9 },
  { id: 'c6', name: 'Decorations', slug: 'decorations', type: 'INGREDIENT', productCount: 14 },
];

export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Rose Garden Birthday Cake',
    slug: 'rose-garden-birthday-cake',
    type: 'CAKE',
    category: 'Birthday Cakes',
    price: 850000,
    status: 'ACTIVE',
    thumbnail: '/images/cake-1.jpg',
    updatedAt: '2026-02-28',
    description: 'A beautiful rose garden themed birthday cake.',
  },
  {
    id: 'p2',
    name: 'Chocolate Lava Dream',
    slug: 'chocolate-lava-dream',
    type: 'CAKE',
    category: 'Birthday Cakes',
    price: 720000,
    status: 'ACTIVE',
    thumbnail: '/images/cake-2.jpg',
    updatedAt: '2026-02-27',
  },
  {
    id: 'p3',
    name: 'Classic White Wedding',
    slug: 'classic-white-wedding',
    type: 'CAKE',
    category: 'Wedding Cakes',
    price: 2400000,
    status: 'ACTIVE',
    thumbnail: '/images/cake-3.jpg',
    updatedAt: '2026-02-25',
  },
  {
    id: 'p4',
    name: 'Matcha Sakura Delight',
    slug: 'matcha-sakura-delight',
    type: 'CAKE',
    category: 'Seasonal',
    price: 650000,
    status: 'INACTIVE',
    thumbnail: '/images/cake-4.jpg',
    updatedAt: '2026-02-20',
  },
  {
    id: 'p5',
    name: 'Premium Almond Flour',
    slug: 'premium-almond-flour',
    type: 'INGREDIENT',
    category: 'Flour & Baking',
    price: 85000,
    status: 'ACTIVE',
    thumbnail: '/images/ing-1.jpg',
    updatedAt: '2026-03-01',
  },
  {
    id: 'p6',
    name: 'Belgian Dark Chocolate 70%',
    slug: 'belgian-dark-chocolate',
    type: 'INGREDIENT',
    category: 'Chocolate & Cocoa',
    price: 120000,
    status: 'ACTIVE',
    thumbnail: '/images/ing-2.jpg',
    updatedAt: '2026-02-28',
  },
  {
    id: 'p7',
    name: 'Edible Gold Flakes',
    slug: 'edible-gold-flakes',
    type: 'INGREDIENT',
    category: 'Decorations',
    price: 250000,
    status: 'ACTIVE',
    thumbnail: '/images/ing-3.jpg',
    updatedAt: '2026-02-26',
  },
];

export const mockOrders: Order[] = [
  {
    id: 'o1',
    orderCode: 'BK20241',
    customerName: 'Linh Nguyen',
    phone: '0901234567',
    total: 880000,
    subtotal: 900000,
    discount: 20000,
    status: 'PENDING',
    fulfillment: 'PICKUP',
    pickupAt: '2026-03-05 10:00',
    paymentMethod: 'Bank Transfer',
    paid: false,
    createdAt: '2026-03-02 08:30',
    items: [
      { id: 'i1', name: 'Rose Garden Birthday Cake', thumbnail: '/images/cake-1.jpg', quantity: 1, unitPrice: 850000, options: { size: 'M', flavor: 'Vanilla', message: 'Happy Birthday!' } },
    ],
  },
  {
    id: 'o2',
    orderCode: 'BK20242',
    customerName: 'An Tran',
    phone: '0912345678',
    total: 1440000,
    subtotal: 1440000,
    discount: 0,
    status: 'CONFIRMED',
    fulfillment: 'DELIVERY',
    address: '123 Nguyen Hue, Dist 1, HCMC',
    paymentMethod: 'Cash',
    paid: false,
    createdAt: '2026-03-02 09:15',
    items: [
      { id: 'i2', name: 'Classic White Wedding', thumbnail: '/images/cake-3.jpg', quantity: 1, unitPrice: 2400000, options: { size: 'L', tier: '2-tier' } },
    ],
  },
  {
    id: 'o3',
    orderCode: 'BK20243',
    customerName: 'Mai Pham',
    phone: '0923456789',
    total: 340000,
    subtotal: 340000,
    discount: 0,
    status: 'PREPARING',
    fulfillment: 'PICKUP',
    pickupAt: '2026-03-02 14:00',
    paymentMethod: 'Cash',
    paid: true,
    createdAt: '2026-03-01 20:00',
    items: [
      { id: 'i3', name: 'Belgian Dark Chocolate 70%', thumbnail: '/images/ing-2.jpg', quantity: 2, unitPrice: 120000 },
      { id: 'i4', name: 'Edible Gold Flakes', thumbnail: '/images/ing-3.jpg', quantity: 1, unitPrice: 250000 },
    ],
  },
  {
    id: 'o4',
    orderCode: 'BK20244',
    customerName: 'Duc Le',
    phone: '0934567890',
    total: 720000,
    subtotal: 720000,
    discount: 0,
    status: 'READY',
    fulfillment: 'PICKUP',
    pickupAt: '2026-03-02 15:30',
    paymentMethod: 'Bank Transfer',
    paid: true,
    createdAt: '2026-03-01 18:00',
    items: [
      { id: 'i5', name: 'Chocolate Lava Dream', thumbnail: '/images/cake-2.jpg', quantity: 1, unitPrice: 720000, options: { size: 'S', flavor: 'Dark Chocolate' } },
    ],
  },
  {
    id: 'o5',
    orderCode: 'BK20245',
    customerName: 'Hoa Vo',
    phone: '0945678901',
    total: 850000,
    subtotal: 850000,
    discount: 0,
    status: 'COMPLETED',
    fulfillment: 'PICKUP',
    paymentMethod: 'Cash',
    paid: true,
    createdAt: '2026-03-01 10:00',
    items: [
      { id: 'i6', name: 'Rose Garden Birthday Cake', thumbnail: '/images/cake-1.jpg', quantity: 1, unitPrice: 850000 },
    ],
  },
  {
    id: 'o6',
    orderCode: 'BK20246',
    customerName: 'Nam Bui',
    phone: '0956789012',
    total: 650000,
    subtotal: 650000,
    discount: 0,
    status: 'CANCELLED',
    fulfillment: 'DELIVERY',
    address: '45 Le Loi, Dist 3, HCMC',
    paymentMethod: 'Cash',
    paid: false,
    createdAt: '2026-02-28 16:00',
    items: [
      { id: 'i7', name: 'Matcha Sakura Delight', thumbnail: '/images/cake-4.jpg', quantity: 1, unitPrice: 650000 },
    ],
  },
];

export const mockBanners: Banner[] = [
  {
    id: 'b1',
    title: 'Spring Collection 2026',
    placement: 'HOME_HERO',
    image: '/images/hero-cake.jpg',
    ctaText: 'Shop Now',
    ctaLink: '/category/seasonal',
    priority: 1,
    active: true,
    createdAt: '2026-02-01',
  },
  {
    id: 'b2',
    title: 'Premium Ingredients Sale',
    placement: 'HOME_PROMO',
    image: '/images/ing-1.jpg',
    ctaText: 'View Deals',
    ctaLink: '/category/ingredients',
    priority: 2,
    active: true,
    createdAt: '2026-02-10',
  },
  {
    id: 'b3',
    title: 'Wedding Season Special',
    placement: 'HOME_HERO',
    image: '/images/cake-3.jpg',
    ctaText: 'Book Now',
    ctaLink: '/category/wedding',
    priority: 3,
    active: false,
    createdAt: '2026-01-15',
  },
];

export const mockCustomers: Customer[] = [
  { id: 'cu1', name: 'Linh Nguyen', email: 'linh@email.com', phone: '0901234567', level: 'GOLD', points: 420, totalOrders: 12, totalSpent: 9800000, createdAt: '2025-06-01' },
  { id: 'cu2', name: 'An Tran', email: 'an@email.com', phone: '0912345678', level: 'SILVER', points: 180, totalOrders: 5, totalSpent: 3200000, createdAt: '2025-09-15' },
  { id: 'cu3', name: 'Mai Pham', email: 'mai@email.com', phone: '0923456789', level: 'PLATINUM', points: 1250, totalOrders: 28, totalSpent: 24500000, createdAt: '2025-01-10' },
  { id: 'cu4', name: 'Duc Le', email: 'duc@email.com', phone: '0934567890', level: 'SILVER', points: 90, totalOrders: 3, totalSpent: 1750000, createdAt: '2025-11-20' },
  { id: 'cu5', name: 'Hoa Vo', email: 'hoa@email.com', phone: '0945678901', level: 'GOLD', points: 540, totalOrders: 15, totalSpent: 11200000, createdAt: '2025-04-05' },
];

// ---- Helpers ----

export function formatVND(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
  PREPARING: 'bg-orange-50 text-orange-700 border-orange-200',
  READY: 'bg-teal-50 text-teal-700 border-teal-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const MEMBER_LEVEL_COLORS: Record<MemberLevel, string> = {
  SILVER: 'bg-slate-100 text-slate-600 border-slate-200',
  GOLD: 'bg-amber-50 text-amber-700 border-amber-200',
  PLATINUM: 'bg-pink-50 text-pink-700 border-pink-200',
};
