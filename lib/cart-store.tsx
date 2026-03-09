'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useAuth } from '@/providers/auth-provider';

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
  productId: string;
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

export interface CheckoutInfo {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerNote?: string;
}

interface CartState {
  user: User | null;
  cart: CartItem[];
  checkoutInfo: CheckoutInfo | null;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  setCheckoutInfo: (info: CheckoutInfo) => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutInfo, setCheckoutInfoState] = useState<CheckoutInfo | null>(
    null,
  );
  const auth = useAuth();

  // Sync user from AuthProvider to cart store
  useEffect(() => {
    if (auth.user) {
      // Convert API user to cart store user format
      setUser({
        name: auth.user.name || auth.user.email,
        level:
          (auth.user.memberLevel?.toLowerCase() as
            | 'silver'
            | 'gold'
            | 'platinum') || 'silver',
        points: auth.user.points || 0,
        savedThisMonth: 0,
      });
    } else {
      setUser(null);
    }
  }, [auth.user]);

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
    setCheckoutInfoState(null);
  }, []);

  const setCheckoutInfo = useCallback((info: CheckoutInfo) => {
    setCheckoutInfoState(info);
  }, []);

  return (
    <CartContext.Provider
      value={{
        user,
        cart,
        checkoutInfo,
        addToCart,
        removeFromCart,
        updateQty,
        clearCart,
        setCheckoutInfo,
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
