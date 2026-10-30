'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { backendClient } from '../api/backend-client';
import { CartQuote, Product as BackendProduct } from '../api/types-v2';
import { useAuth } from './auth-context';

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  retailPrice: number;
  wholesalePrice: number;
  unitOfMeasure: string;
  unit?: string;
  moq: number;
  moqIncrement: number;
  stockQuantity: number;
  isEggless: boolean;
  isVegetarian: boolean;
  dietaryTags?: string | null;
  packDetails?: string | null;
  shelfLifeDays?: number | null;
  categoryName?: string | null;
}

export interface CartItem {
  productId: string;
  product: CartProduct;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  channel: 'B2C' | 'B2B';
  setChannel: (channel: 'B2C' | 'B2B') => void;
  addItem: (product: any, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  quote: CartQuote | null;
  validation: any | null; // Compatibility with legacy validation consumers
  isValidating: boolean;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, role, isAuthenticated } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const mandatedChannel: 'B2C' | 'B2B' = role === 'RETAILER' ? 'B2B' : 'B2C';
  const [channel, setChannelState] = useState<'B2C' | 'B2B'>(mandatedChannel);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Scoped storage key per authenticated user
  const storageKey = useMemo(() => {
    return user?.id ? `bakeconnect_cart_${user.id}` : 'bakeconnect_cart_guest';
  }, [user?.id]);

  // Keep channel synchronized with role
  useEffect(() => {
    setChannelState(role === 'RETAILER' ? 'B2B' : 'B2C');
  }, [role]);

  // Load cart from user-scoped localStorage safely on mount or user switch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) {
          setItems(parsed.items);
        } else {
          setItems([]);
        }
        if (role === 'RETAILER') {
          setChannelState('B2B');
        } else if (role === 'DIRECT_CUSTOMER') {
          setChannelState('B2C');
        } else if (parsed.channel === 'B2B' || parsed.channel === 'B2C') {
          setChannelState(parsed.channel);
        }
      } else {
        setItems([]);
        setChannelState(role === 'RETAILER' ? 'B2B' : 'B2C');
      }
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey, role]);

  // Listen for logout events across tabs to immediately clear in-memory cart
  useEffect(() => {
    const handleLogout = () => {
      setItems([]);
      setQuote(null);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bakeconnect_token_v1' && !e.newValue) {
        handleLogout();
      }
    };

    window.addEventListener('bakeconnect_logout', handleLogout);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('bakeconnect_logout', handleLogout);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save cart to user-scoped localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ items, channel }));
    } catch {
      // Ignore localStorage write errors
    }
  }, [items, channel, isLoaded, storageKey]);

  // Revalidate cart authoritatively with Backend Quotation API whenever items change
  useEffect(() => {
    if (!isLoaded) return;

    let isMounted = true;
    async function fetchServerQuote() {
      if (items.length === 0) {
        setQuote(null);
        return;
      }

      setIsValidating(true);
      try {
        const serverQuote = await backendClient.getQuote(
          items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
        );
        if (isMounted) {
          setQuote(serverQuote);
        }
      } catch (err) {
        console.warn('Backend cart quote fallback to local computation:', err);
      } finally {
        if (isMounted) setIsValidating(false);
      }
    }

    const timer = setTimeout(() => {
      fetchServerQuote();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, channel, isLoaded]);

  const setChannel = (newChannel: 'B2C' | 'B2B') => {
    if (role === 'RETAILER') {
      setChannelState('B2B');
    } else if (role === 'DIRECT_CUSTOMER') {
      setChannelState('B2C');
    } else {
      setChannelState(newChannel);
    }
  };

  const addItem = (product: any, quantity = 1) => {
    // Enforce authentication before purchase: prompt and redirect to login
    if (!isAuthenticated) {
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname : '/cart';
      router.push(`/login?redirect=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent('Please log in before adding items to your basket')}`);
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            imageUrl: product.imageUrl || '/images/products/fresh-ladi-pav.png',
            retailPrice: Number(product.retailPrice) || 0,
            wholesalePrice: Number(product.wholesalePrice) || Number(product.retailPrice) || 0,
            unitOfMeasure: product.unitOfMeasure ?? product.unit ?? 'PIECE',
            unit: product.unitOfMeasure ?? product.unit ?? 'PIECE',
            moq: Number(product.moq) || 1,
            moqIncrement: Number(product.moqIncrement) || 1,
            stockQuantity: Number(product.stockQuantity) || 100,
            isEggless: Boolean(product.isEggless),
            isVegetarian: product.isVegetarian !== undefined ? Boolean(product.isVegetarian) : true,
            dietaryTags: product.dietaryTags || 'VEGETARIAN',
            packDetails: product.packDetails || null,
            shelfLifeDays: product.shelfLifeDays || 3,
            categoryName: product.categoryName || null,
          },
          quantity,
        },
      ];
    });

    // Instead of opening a drawer, direct navigation to /cart is used
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearCart = () => {
    setItems([]);
    setQuote(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  const setIsCartOpen = useCallback((open: boolean) => {
    if (open) {
      router.push('/cart');
    }
  }, [router]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Synthesize legacy CartValidationResult for backwards compatibility
  const validation = useMemo(() => {
    if (quote) {
      return {
        isValid: quote.isValidForCheckout,
        subtotal: quote.subtotal,
        discount: quote.discountAmount,
        tax: quote.taxAmount,
        totalAmount: quote.totalAmount,
        moqViolations: quote.validationErrors.map((msg) => ({
          productId: '',
          productName: '',
          requested: 0,
          moq: 0,
          moqIncrement: 0,
          message: msg,
        })),
        stockViolations: [],
        priceDiscrepancies: [],
      };
    }
    const subtotal = items.reduce(
      (sum, i) =>
        sum +
        (channel === 'B2B' ? i.product.wholesalePrice : i.product.retailPrice) *
          i.quantity,
      0
    );
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    return {
      isValid: true,
      subtotal,
      discount: 0,
      tax,
      totalAmount: subtotal + tax,
      moqViolations: [],
      stockViolations: [],
      priceDiscrepancies: [],
    };
  }, [quote, items, channel]);

  return (
    <CartContext.Provider
      value={{
        items,
        channel,
        setChannel,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        isCartOpen: false,
        setIsCartOpen,
        quote,
        validation,
        isValidating,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
