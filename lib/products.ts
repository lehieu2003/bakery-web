export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  type: 'cake' | 'ingredient';
  description?: string;
  weight?: string;
  origin?: string;
  brand?: string;
}

export const CAKES: Product[] = [
  {
    id: 'c1',
    name: 'Rose Signature Cake',
    price: 450000,
    image: '/images/cake-1.jpg',
    type: 'cake',
    description: 'Single-tier with white fondant and rose decor',
  },
  {
    id: 'c2',
    name: 'Dark Chocolate Mousse',
    price: 380000,
    image: '/images/cake-2.jpg',
    type: 'cake',
    description: 'Glossy ganache with fresh berry topping',
  },
  {
    id: 'c3',
    name: 'Strawberry Chiffon',
    price: 320000,
    image: '/images/cake-3.jpg',
    type: 'cake',
    description: 'Light chiffon with whipped cream and strawberries',
  },
  {
    id: 'c4',
    name: 'Grand Tiered Wedding',
    price: 1200000,
    image: '/images/cake-4.jpg',
    type: 'cake',
    description: 'Elegant tiered cake with buttercream rosettes',
  },
];

export const INGREDIENTS: Product[] = [
  {
    id: 'i1',
    name: 'Premium Almond Flour',
    price: 85000,
    image: '/images/ing-1.jpg',
    type: 'ingredient',
    weight: '500g',
    origin: 'France',
    description: '500g · France · Fine-ground blanched almonds',
  },
  {
    id: 'i2',
    name: 'Dark Couverture Chocolate',
    price: 120000,
    image: '/images/ing-2.jpg',
    type: 'ingredient',
    weight: '300g',
    origin: 'Belgium',
    description: '300g · Belgium · 72% cacao',
  },
  {
    id: 'i3',
    name: 'Pure Vanilla Extract',
    price: 95000,
    image: '/images/ing-3.jpg',
    type: 'ingredient',
    weight: '100ml',
    origin: 'Madagascar',
    description: '100ml · Madagascar · Organic',
  },
];

export const ALL_PRODUCTS = [...CAKES, ...INGREDIENTS];

export function getProductById(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}
