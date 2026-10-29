'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { CatalogProduct } from '../api/catalog';

// ─── Tipos ──────────────────────────────────────────────
export interface SelectedAddon {
  addonId: number;
  name: string;
  price: string;
}

export interface CartItem {
  key: string; // `${productId}-${addonsKey}` para agrupar iguales
  product: CatalogProduct;
  quantity: number;
  addons: SelectedAddon[];
  notes: string;
  unitTotal: number; // producto + addons
}

export interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: CatalogProduct, addons: SelectedAddon[], notes: string, quantity: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function addonsKey(addons: SelectedAddon[]): string {
  return addons
    .map((a) => a.addonId)
    .sort()
    .join('-');
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (product: CatalogProduct, addons: SelectedAddon[], notes: string, quantity: number) => {
      const aKey = addonsKey(addons);
      const key = `${product.id}-${aKey}`;
      const addonsTotal = addons.reduce((sum, a) => sum + parseFloat(a.price || '0'), 0);
      const unitTotal = parseFloat(product.price) + addonsTotal;

      setItems((prev) => {
        const existing = prev.find((i) => i.key === key && i.notes === notes);
        if (existing) {
          return prev.map((i) =>
            i.key === key && i.notes === notes ? { ...i, quantity: i.quantity + quantity } : i,
          );
        }
        return [...prev, { key, product, quantity, addons, notes, unitTotal }];
      });
    },
    [],
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const totalPrice = useMemo(
    () => items.reduce((s, i) => s + i.unitTotal * i.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{ items, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
  return ctx;
}