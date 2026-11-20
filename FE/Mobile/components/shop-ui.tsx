import { Pressable, Text } from '@/components/ui';
import { ProductMetrics } from '@/components/product-metrics';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';
import { useShopStyles } from '@/components/shop-appearance';
import { cardShadow, space, typography, layout, radius, type ShopPalette } from '@/constants/shop-theme';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils/format';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function ScreenHeading({ eyebrow, title, subtitle, icon, action }: { eyebrow: string; title: string; subtitle?: string; icon?: IconName; action?: ReactNode }) {
  const { shop, styles } = useShopStyles(makeStyles);
  return <View style={styles.headingRow}>
    <View style={styles.headingCopy}><Text style={styles.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
    {action ?? (icon ? <View style={styles.headingIcon}><MaterialIcons name={icon} size={25} color={shop.primary} /></View> : null)}
  </View>;
}

export function ProductImage({ uri, style }: { uri?: string | null; style?: StyleProp<ImageStyle> }) {
  const { shop, styles } = useShopStyles(makeStyles);
  const [failedUri, setFailedUri] = useState<string>();
  if (!uri || failedUri === uri) return <View style={[styles.imageFallback, style]}><MaterialIcons name="electrical-services" size={36} color={shop.muted} /><Text style={styles.fallbackText}>Electric Shop</Text></View>;
  return <Image source={{ uri }} resizeMode="contain" style={style} onError={() => setFailedUri(uri)} />;
}

export function ProductCard({ product }: { product: Product }) {
  const { shop, styles } = useShopStyles(makeStyles);
  const metadata = product.ten_thuong_hieu || product.ten_danh_muc;
  const warranty = Number(product.bao_hanh);
  const inStock = Number(product.so_luong) > 0 && product.trang_thai !== 'HetHang' && product.trang_thai !== 'NgungBan';
  const badgeLabel = inStock ? (warranty > 0 ? `Bảo hành ${warranty} tháng` : 'Có sẵn') : (product.trang_thai === 'NgungBan' ? 'Ngừng bán' : 'Hết hàng');

  return (
    <Link href={{ pathname: '/product/[id]', params: { id: String(product.ma_san_pham) } }} asChild>
      <Pressable accessibilityLabel={`Xem ${product.ten_san_pham}`} accessibilityRole="button" style={styles.product} android_ripple={{ color: shop.soft }}>
        <View style={styles.imageWrap}>
          <ProductImage uri={product.hinh_anh} style={styles.productImage} />
          <View style={[styles.productBadge, !inStock && styles.unavailableBadge]}>
            <MaterialIcons name={inStock ? 'check-circle-outline' : 'inventory-2'} size={13} color={inStock ? shop.primary : shop.danger} />
            <Text style={[styles.badgeLabel, !inStock && styles.unavailableLabel]}>{badgeLabel}</Text>
          </View>
        </View>
        <View style={styles.productCopy}>
          <View style={styles.productHeading}>
            {metadata ? <Text numberOfLines={1} style={styles.productCategory}>{metadata}</Text> : null}
            <Text numberOfLines={2} style={styles.productName}>{product.ten_san_pham}</Text>
          </View>
          <View>
            <Text style={styles.price}>{formatCurrency(product.gia_ban)}</Text>
            <ProductMetrics product={product} compact />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export function EmptyState({ icon, title, message, action, onAction }: { icon: IconName; title: string; message?: string; action?: string; onAction?: () => void }) {
  const { shop, styles } = useShopStyles(makeStyles);
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name={icon} size={36} color={shop.primary} /></View><Text style={styles.emptyTitle}>{title}</Text>{message ? <Text style={styles.emptyMessage}>{message}</Text> : null}{action && onAction ? <Pressable accessibilityRole="button" style={styles.action} onPress={onAction}><Text style={styles.actionText}>{action}</Text><MaterialIcons name="arrow-forward" size={18} color="#fff" /></Pressable> : null}</View>;
}

export function LoadingState({ message }: { message: string }) {
  const { shop, styles } = useShopStyles(makeStyles);
  return <View accessibilityRole="progressbar" accessibilityLabel={message} style={{ paddingVertical: space.lg, gap: space.lg }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}><ActivityIndicator color={shop.primary} /><Text style={styles.subtitle}>{message}</Text></View><View style={{ flexDirection: 'row', gap: space.sm }}>{[0, 1].map(key => <View key={key} style={{ flex: 1, gap: space.sm }}><View style={{ height: 144, borderRadius: 16, backgroundColor: shop.border }} /><View style={{ height: 12, borderRadius: 4, backgroundColor: shop.border, width: '80%' }} /><View style={{ height: 12, borderRadius: 4, backgroundColor: shop.border, width: '45%' }} /></View>)}</View></View>;
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg, paddingTop: 8 },
  headingCopy: { flex: 1 },
  eyebrow: { color: shop.primary, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { ...typography.heading, color: shop.ink, marginTop: space.xs },
  subtitle: { ...typography.body, color: shop.muted, marginTop: space.xxs },
  headingIcon: { width: 48, height: 48, borderRadius: radius.lg, borderWidth: 1, borderColor: shop.border, backgroundColor: shop.surface, alignItems: 'center', justifyContent: 'center' },
  product: { flex: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border, ...cardShadow },
  imageWrap: { backgroundColor: shop.surfaceMuted, borderBottomWidth: 1, borderColor: shop.border, overflow: 'hidden' },
  productImage: { width: '100%', aspectRatio: 1 },
  productBadge: {
    position: 'absolute', start: 6, bottom: 6, maxWidth: '92%', flexDirection: 'row', alignItems: 'center', gap: space.xxs,
    paddingVertical: space.xxs, paddingHorizontal: 6, borderRadius: radius.sm, backgroundColor: shop.soft,
  },
  unavailableBadge: { backgroundColor: shop.dangerSoft },
  badgeLabel: { color: shop.primary, fontSize: 11, lineHeight: 14, fontWeight: '700', flexShrink: 1 },
  unavailableLabel: { color: shop.danger },
  productCopy: { flex: 1, justifyContent: 'space-between', padding: 10, gap: space.xs },
  productHeading: { gap: 3 },
  productCategory: { color: shop.muted, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  productName: { color: shop.ink, fontSize: 14, fontWeight: '600', lineHeight: 19, minHeight: 38 },
  price: { color: shop.productPrice, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: shop.soft, gap: space.xs },
  fallbackText: { color: shop.muted, fontSize: 12, letterSpacing: 1 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: layout.gutter, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: shop.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: shop.ink, textAlign: 'center' },
  emptyMessage: { color: shop.muted, lineHeight: 22, fontSize: 14, textAlign: 'center', maxWidth: 290 },
  action: { minHeight: layout.touch, flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: shop.action, borderRadius: radius.md, paddingHorizontal: 22, marginTop: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
