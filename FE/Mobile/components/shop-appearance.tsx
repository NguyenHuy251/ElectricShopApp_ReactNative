import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';
import { darkShop, lightShop, type ShopPalette } from '@/constants/shop-theme';

type Scheme = 'light' | 'dark';
const storageKey = 'electricshop.appearance';
const ShopAppearanceContext = createContext({
  scheme: 'light' as Scheme,
  shop: lightShop,
  setScheme: (_scheme: Scheme) => {},
});

export function ShopAppearanceProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Scheme | null>(null);
  const saves = useRef(Promise.resolve());
  const scheme = preference ?? (system === 'dark' ? 'dark' : 'light');
  const shop = scheme === 'dark' ? darkShop : lightShop;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(saved => {
      if (active && (saved === 'light' || saved === 'dark')) {
        setPreference(current => current ?? saved);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (preference && Platform.OS !== 'web') Appearance.setColorScheme(preference);
  }, [preference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(shop.background).catch(() => {});
  }, [shop.background]);

  const setScheme = useCallback((next: Scheme) => {
    setPreference(next);
    saves.current = saves.current.then(() => AsyncStorage.setItem(storageKey, next)).catch(() => {});
  }, []);

  const value = useMemo(() => ({ scheme, shop, setScheme }), [scheme, shop, setScheme]);
  return <ShopAppearanceContext.Provider value={value}>{children}</ShopAppearanceContext.Provider>;
}

export const useShopAppearance = () => useContext(ShopAppearanceContext);

export function useShopStyles<T>(createStyles: (shop: ShopPalette) => T) {
  const { scheme, shop } = useShopAppearance();
  const styles = useMemo(() => createStyles(shop), [createStyles, shop]);
  return { scheme, shop, styles };
}
