import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Pressable, Text } from './ui';
import api from '@/services/api';
import { useShopStyles } from '@/components/shop-appearance';
import { type ShopPalette } from '@/constants/shop-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
export function InboxUnreadNotice() {
  const { shop, styles } = useShopStyles(makeStyles);
  const router = useRouter(),
    insets = useSafeAreaInsets();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);
  const poll = useCallback(async () => {
    try {
      const r = await api.get('/inbox/mine/unread');
      return Number(r.data.data.count) || 0;
    } catch {
      return 0;
    }
  }, []);
  useEffect(() => {
    let active = true,
      busy = false;
    const load = async () => {
      if (busy) return;
      busy = true;
      const next = await poll();
      if (active) {
        setCount(next);
        if (next === 0) setDismissed(null);
      }
      busy = false;
    };
    void load();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void load();
    }, 10000);
    const listener = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load();
    });
    return () => {
      active = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [poll]);
  if (!count || count === dismissed) return null;
  return (
    <View style={[styles.notice, { top: insets.top + 8 }]}>
      <Pressable style={{ flex: 1 }} onPress={() => router.push('/contact')}>
        <Text style={styles.title}>Cửa hàng gửi bạn {count} tin nhắn mới</Text>
        <Text style={{ color: shop.primary }}>Mở hộp thư →</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Ẩn thông báo tin nhắn"
        onPress={() => setDismissed(count)}
      >
        <Text style={{ padding: 10 }}>✕</Text>
      </Pressable>
    </View>
  );
}
const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  notice: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    elevation: 5,
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  title: { fontWeight: '700', marginBottom: 5 },
});
