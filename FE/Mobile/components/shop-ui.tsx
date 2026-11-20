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
  return <Link href={{ pathname: '/product/[id]', params: { id: String(product.ma_san_pham) } }} asChild>
    <Pressable accessibilityLabel={`Xem ${product.ten_san_pham}`} accessibilityRole="button" style={styles.product} android_ripple={{ color: shop.soft }}>
      <View style={styles.imageWrap}><ProductImage uri={product.hinh_anh} style={styles.productImage} /><View style={styles.productArrow}><MaterialIcons name="north-east" size={16} color={shop.ink} /></View></View>
      <View style={styles.productCopy}>
        <Text numberOfLines={1} style={styles.productCategory}>{product.ten_thuong_hieu || product.ten_danh_muc || 'ĐIỆN GIA DỤNG'}</Text>
        <Text numberOfLines={2} style={styles.productName}>{product.ten_san_pham}</Text>
        <Text style={styles.price}>{formatCurrency(product.gia_ban)}</Text>
        <ProductMetrics product={product} compact />
        <View style={styles.stockRow}><View style={[styles.dot, Number(product.so_luong) <= 0 && { backgroundColor: shop.danger }]} /><Text style={styles.stock}>{Number(product.so_luong) > 0 ? 'Có sẵn' : 'Hết hàng'}</Text></View>
      </View>
    </Pressable>
  </Link>;
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
  product: { flex: 1, overflow: 'hidden', borderRadius: 18, backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border, ...cardShadow },
  imageWrap: { backgroundColor: shop.surfaceMuted, overflow: 'hidden' },
  productImage: { width: '100%', aspectRatio: 1.05 },
  productArrow: { position: 'absolute', right: 8, bottom: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: shop.surface, justifyContent: 'center', alignItems: 'center' },
  productCopy: { padding: 14, gap: 2 },
  productCategory: { color: shop.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  productName: { color: shop.ink, fontSize: 14, fontWeight: '700', lineHeight: 21, minHeight: 42, marginTop: 6 },
  price: { color: shop.ink, fontSize: 18, fontWeight: '700', marginTop: 12, letterSpacing: -0.4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: shop.action },
  stock: { color: shop.muted, fontSize: 12 },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: shop.soft, gap: space.xs },
  fallbackText: { color: shop.muted, fontSize: 12, letterSpacing: 1 },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: layout.gutter, gap: 14 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: shop.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: shop.ink, textAlign: 'center' },
  emptyMessage: { color: shop.muted, lineHeight: 22, fontSize: 14, textAlign: 'center', maxWidth: 290 },
  action: { minHeight: layout.touch, flexDirection: 'row', gap: space.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: shop.action, borderRadius: radius.md, paddingHorizontal: 22, marginTop: 8 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
