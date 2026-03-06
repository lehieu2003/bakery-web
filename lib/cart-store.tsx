'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

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

interface CartState {
  user: User | null;
  cart: CartItem[];
  login: () => void;
  logout: () => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  placeOrder: (onSuccess: (orderNum: string) => void) => void;
}

const CartContext = createContext<CartState | null>(null);

const MOCK_USER: User = {
  name: 'Linh Nguyen',
  level: 'gold',
  points: 420,
  savedThisMonth: 120000,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const login = useCallback(() => {
    setUser(MOCK_USER);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const placeOrder = useCallback((onSuccess: (orderNum: string) => void) => {
    // Generate a random order number
    const orderNum = `BK${Date.now().toString().slice(-6)}`;
    // Clear cart
    setCart([]);
    // Call success callback
    onSuccess(orderNum);
  }, []);

  return (
    <CartContext.Provider
      value={{
        user,
        cart,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
