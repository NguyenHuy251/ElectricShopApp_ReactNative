import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { useShopStyles } from '@/components/shop-appearance';
import { space, typography, type ShopPalette } from '@/constants/shop-theme';
import type { Product } from '@/types';

export function ProductMetrics({ product, compact = false }: { product: Product; compact?: boolean }) {
  const { shop, styles } = useShopStyles(makeStyles);
  const count = Number(product.so_luong_danh_gia || 0);
  const rating = Number(product.diem_danh_gia);
  const hasRating = count > 0 && Number.isFinite(rating) && rating >= 1 && rating <= 5;
  const sold = product.so_luong_da_ban;
  const ratingLabel = hasRating ? `${rating.toFixed(1)}${compact ? '' : '/5'} (${count.toLocaleString('vi-VN')}${compact ? '' : ' đánh giá'})` : compact ? 'Chưa đánh giá' : 'Chưa có đánh giá';
  const soldLabel = `Đã bán ${sold == null ? '—' : sold.toLocaleString('vi-VN')}`;
  return <View style={[styles.container, compact && styles.compact]}>
    <View accessible accessibilityLabel={hasRating ? `${rating.toFixed(1)} trên 5 sao, ${count} đánh giá` : ratingLabel} style={styles.rating}>
      <MaterialIcons name={hasRating ? 'star' : 'star-border'} size={compact ? 14 : 18} color={hasRating ? shop.warning : shop.muted} />
      <Text style={[styles.text, hasRating && styles.score]}>{ratingLabel}</Text>
    </View>
    <Text style={styles.text}>{soldLabel}</Text>
  </View>;
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, rowGap: space.xxs, marginTop: space.xs },
  compact: { flexDirection: 'column', alignItems: 'flex-start', gap: space.xxs },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, flexShrink: 1 },
  text: { ...typography.caption, color: shop.muted, flexShrink: 1 },
  score: { color: shop.ink, fontWeight: '600' },
});
