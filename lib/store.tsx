'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type Screen =
  | 'splash'
  | 'home'
  | 'category'
  | 'product-detail'
  | 'cart'
  | 'checkout-info'
  | 'checkout-payment'
  | 'success'
  | 'profile'
  | 'auth';

export type MemberLevel = 'silver' | 'gold' | 'platinum';

export interface User {
  name: string;
  avatar?: string;
  level: MemberLevel;
  points: number;
  savedThisMonth: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  type: 'cake' | 'ingredient';
  size?: string;
  flavor?: string;
  message?: string;
  pickupDate?: string;
  quantity: number;
}

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

interface AppState {
  screen: Screen;
  user: User | null;
  cart: CartItem[];
  selectedProduct: Product | null;
  selectedCategory: 'cake' | 'ingredient';
  orderNumber: string;
  navigate: (screen: Screen) => void;
  login: () => void;
  logout: () => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  selectProduct: (product: Product) => void;
  setCategory: (cat: 'cake' | 'ingredient') => void;
  clearCart: () => void;
  placeOrder: () => void;
}

const AppContext = createContext<AppState | null>(null);

const MOCK_USER: User = {
  name: 'Linh Nguyen',
  level: 'gold',
  points: 420,
  savedThisMonth: 120000,
};

const generateOrderNo = () => 'BK' + Math.floor(20000 + Math.random() * 9999);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>('splash');
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    'cake' | 'ingredient'
  >('cake');
  const [orderNumber, setOrderNumber] = useState('');

  const navigate = useCallback((s: Screen) => setScreen(s), []);

  const login = useCallback(() => {
    setUser(MOCK_USER);
    setScreen('home');
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setScreen('home');
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing)
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i,
      ),
    );
  }, []);

  const selectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setScreen('product-detail');
  }, []);

  const setCategory = useCallback((cat: 'cake' | 'ingredient') => {
    setSelectedCategory(cat);
    setScreen('category');
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const placeOrder = useCallback(() => {
    setOrderNumber(generateOrderNo());
    setCart([]);
    setScreen('success');
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen,
        user,
        cart,
        selectedProduct,
        selectedCategory,
        orderNumber,
        navigate,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateQty,
        selectProduct,
        setCategory,
        clearCart,
        placeOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
