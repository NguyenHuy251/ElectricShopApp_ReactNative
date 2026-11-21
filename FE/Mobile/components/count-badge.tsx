import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useShopStyles } from '@/components/shop-appearance';
import { Text } from '@/components/ui';
import type { ShopPalette } from '@/constants/shop-theme';

export function CountBadge({ count, style }: { count: number; style?: StyleProp<ViewStyle> }) {
  const { styles } = useShopStyles(makeStyles);
  if (count <= 0) return null;

  return (
    <View aria-hidden pointerEvents="none" style={[styles.badge, style]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  badge: {
    position: 'absolute', right: -3, top: -3, minWidth: 20, height: 20, borderRadius: 15,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: shop.background,
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
