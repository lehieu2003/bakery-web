'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from '@/providers/auth-provider';
import { notifyAddedToCart } from '@/lib/cart-toast';
import {
  GUEST_CART_STORAGE_KEY,
  clampCartQuantityWithDelta,
  getUserCartStorageKey,
  mergeCartItems,
  normalizeCartItem,
  normalizeCheckoutInfo,
  readPersistedCartState,
  removePersistedCartState,
  writePersistedCartState,
} from '@/lib/cart-utils';

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
  variantId?: string;
  variantName?: string;
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
  customerAddress?: string;
  deliveryMethod?: 'pickup' | 'delivery';
  addressId?: string;
}

interface CartState {
  user: User | null;
  cart: CartItem[];
  checkoutInfo: CheckoutInfo | null;
  addToCart: (item: CartItem) => void;
  replaceCart: (items: CartItem[]) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  setCheckoutInfo: (info: CheckoutInfo) => void;
  /** The order summary drawer, opened from the header cart icon. */
  orderSummaryOpen: boolean;
  setOrderSummaryOpen: (open: boolean) => void;
}

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutInfo, setCheckoutInfoState] = useState<CheckoutInfo | null>(
    null,
  );
  const [orderSummaryOpen, setOrderSummaryOpen] = useState(false);
  const hasHydratedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const auth = useAuth();

  const user: User | null = auth.user
    ? {
        name: auth.user.name || auth.user.email,
        level:
          (auth.user.memberLevel?.toLowerCase() as
            | 'silver'
            | 'gold'
            | 'platinum') || 'silver',
        points: auth.user.points || 0,
        savedThisMonth: 0,
      }
    : null;

  const addToCart = useCallback((item: CartItem) => {
    const normalizedItem = normalizeCartItem(item);
    if (!normalizedItem) return;

    setCart((prev) => {
      return mergeCartItems(prev, [normalizedItem]);
    });
    notifyAddedToCart(normalizedItem, () => setOrderSummaryOpen(true));
  }, []);

  const replaceCart = useCallback((items: CartItem[]) => {
    const normalizedItems = items
      .map((item) => normalizeCartItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    setCart(mergeCartItems([], normalizedItems));
    setCheckoutInfoState(null);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: clampCartQuantityWithDelta(item.quantity, delta),
            }
          : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCheckoutInfoState(null);
  }, []);

  const setCheckoutInfo = useCallback((info: CheckoutInfo) => {
    setCheckoutInfoState(normalizeCheckoutInfo(info));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (auth.isLoading || hasHydratedRef.current) return;

    const currentUserId = auth.user?.id ?? null;
    const storage = window.localStorage;
    const guestState = readPersistedCartState(storage, GUEST_CART_STORAGE_KEY);

    if (currentUserId) {
      const userStorageKey = getUserCartStorageKey(currentUserId);
      const userState = readPersistedCartState(storage, userStorageKey);
      // Deterministic precedence: merge persisted guest cart into user cart.
      const mergedCart = mergeCartItems(userState.cart, guestState.cart);
      const mergedCheckoutInfo =
        normalizeCheckoutInfo(guestState.checkoutInfo) ??
        normalizeCheckoutInfo(userState.checkoutInfo);

      queueMicrotask(() => {
        hasHydratedRef.current = true;
        previousUserIdRef.current = currentUserId;
        setCart(mergedCart);
        setCheckoutInfoState(mergedCheckoutInfo);
      });

      writePersistedCartState(storage, userStorageKey, {
        cart: mergedCart,
        checkoutInfo: mergedCheckoutInfo,
      });
      removePersistedCartState(storage, GUEST_CART_STORAGE_KEY);
    } else {
      queueMicrotask(() => {
        hasHydratedRef.current = true;
        previousUserIdRef.current = currentUserId;
        setCart(guestState.cart);
        setCheckoutInfoState(normalizeCheckoutInfo(guestState.checkoutInfo));
      });
    }
  }, [auth.isLoading, auth.user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (auth.isLoading || !hasHydratedRef.current) return;

    const currentUserId = auth.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;
    if (previousUserId === currentUserId) return;

    const storage = window.localStorage;

    if (currentUserId) {
      const userStorageKey = getUserCartStorageKey(currentUserId);
      const userState = readPersistedCartState(storage, userStorageKey);
      // Deterministic precedence: merge active in-memory session cart into user cart.
      const mergedCart = mergeCartItems(userState.cart, cart);
      const mergedCheckoutInfo =
        normalizeCheckoutInfo(checkoutInfo) ??
        normalizeCheckoutInfo(userState.checkoutInfo);

      queueMicrotask(() => {
        setCart(mergedCart);
        setCheckoutInfoState(mergedCheckoutInfo);
      });

      writePersistedCartState(storage, userStorageKey, {
        cart: mergedCart,
        checkoutInfo: mergedCheckoutInfo,
      });
      removePersistedCartState(storage, GUEST_CART_STORAGE_KEY);
    } else {
      writePersistedCartState(storage, GUEST_CART_STORAGE_KEY, {
        cart,
        checkoutInfo,
      });
    }

    previousUserIdRef.current = currentUserId;
  }, [auth.isLoading, auth.user?.id, cart, checkoutInfo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasHydratedRef.current) return;

    const storage = window.localStorage;
    const currentUserId = auth.user?.id ?? null;
    const storageKey = currentUserId
      ? getUserCartStorageKey(currentUserId)
      : GUEST_CART_STORAGE_KEY;

    writePersistedCartState(storage, storageKey, {
      cart,
      checkoutInfo,
    });
  }, [auth.user?.id, cart, checkoutInfo]);

  return (
    <CartContext.Provider
      value={{
        user,
        cart,
        checkoutInfo,
        addToCart,
        replaceCart,
        removeFromCart,
        updateQty,
        clearCart,
        setCheckoutInfo,
        orderSummaryOpen,
        setOrderSummaryOpen,
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
