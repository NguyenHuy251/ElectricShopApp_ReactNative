import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { cartService } from '@/services/cart.service';
import type { CartItem } from '@/types';

const CartContext = createContext<{
  items: CartItem[];
  refresh: (afterChange?: boolean) => Promise<void>;
} | null>(null);

export function CartProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const pending = useRef<Promise<void> | null>(null);

  const refresh = useCallback((afterChange = false) => {
    if (!enabled) return Promise.resolve();
    if (pending.current && !afterChange) return pending.current;

    const request: Promise<void> = cartService.getCart().then(({ data }) => {
      // Ignore older reads that started before a cart change.
      if (pending.current === request) setItems(data?.items ?? []);
    }).finally(() => {
      if (pending.current === request) pending.current = null;
    });

    pending.current = request;
    return request;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const load = () => { void refresh().catch(() => undefined); };
    load();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    return () => {
      listener.remove();
      pending.current = null;
    };
  }, [enabled, refresh]);

  return <CartContext.Provider value={{ items, refresh }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart requires CartProvider');
  return cart;
}
