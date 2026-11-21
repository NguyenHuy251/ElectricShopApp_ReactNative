import { Pressable, Text } from '@/components/ui';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ProductImage, ScreenHeading } from '@/components/shop-ui';
import { TabHeaderActions } from '@/components/tab-header-actions';
import { useCart } from '@/components/cart-provider';
import { cartService } from '@/services/cart.service';
import { productService } from '@/services/product.service';
import type { CartItem, ProductVariant } from '@/types';
import { formatCurrency, getApiMessage } from '@/utils/format';

export default function CartScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const dockHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { items, refresh } = useCart();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [variantPicker, setVariantPicker] = useState<{ item: CartItem; variants: ProductVariant[] } | null>(null);
  const busy = useRef(false);

  const loadCart = useCallback(async (afterChange = false) => {
    try {
      await refresh(afterChange);
      setError('');
    } catch (err) { setError(getApiMessage(err, 'Không thể tải giỏ hàng.')); }
    finally { setLoading(false); setRefreshing(false); }
  }, [refresh]);
  useFocusEffect(useCallback(() => { void loadCart(); }, [loadCart]));

  const update = async (item: CartItem, quantity: number) => {
    if (busy.current) return;
    busy.current = true;
    setUpdating(true);
    setError('');
    try {
      if (quantity <= 0) await cartService.removeCartItem(item.ma_san_pham, item.ma_bien_the);
      else await cartService.updateCartItem(item.ma_san_pham, quantity, item.ma_bien_the);
      await loadCart(true);
    } catch (err) { setError(getApiMessage(err, 'Không thể cập nhật giỏ hàng.')); }
    finally { busy.current = false; setUpdating(false); }
  };

  const total = items.reduce((sum, item) => sum + Number(item.gia_ban) * item.so_luong, 0);
  const needsVariant = items.some(item => Boolean(item.needs_variant));
  const chooseVariant = async (item: CartItem) => {
    if (busy.current) return;
    busy.current = true; setUpdating(true); setError(''); setVariantPicker(null);
    try {
      const { data } = await productService.getProductById(item.ma_san_pham);
      setVariantPicker({ item, variants: data.variants || [] });
    } catch (err) { setError(getApiMessage(err, 'Không thể tải biến thể.')); }
    finally { busy.current = false; setUpdating(false); }
  };
  const selectVariant = async (variant: ProductVariant) => {
    if (!variantPicker || busy.current) return;
    busy.current = true; setUpdating(true); setError('');
    try {
      await cartService.selectVariant(variantPicker.item.ma_san_pham, variant.ma_bien_the, variantPicker.item.ma_bien_the);
      setVariantPicker(null); await loadCart(true);
    } catch (err) { setError(getApiMessage(err, 'Không thể chọn biến thể.')); }
    finally { busy.current = false; setUpdating(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: dockHeight + space.md }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadCart(); }} />}
    >
      <ScreenHeading eyebrow="GIỎ HÀNG CỦA BẠN" title="Sắp về với tổ ấm" subtitle="Kiểm tra sản phẩm rồi tiếp tục đến bước thanh toán." action={<TabHeaderActions />} />
      {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.error}>{error}</Text><Pressable onPress={() => void loadCart()}><Text style={styles.link}>Tải lại giỏ hàng</Text></Pressable></View> : null}
      {loading ? <LoadingState message="Đang tải giỏ hàng..." /> : !items.length ? <EmptyState icon="shopping-bag" title="Giỏ hàng chờ bạn chọn" action="Khám phá sản phẩm" onAction={() => router.push('/products')} /> : <>
        {items.map(item => <View style={styles.item} key={`${item.ma_san_pham}:${item.ma_bien_the || 0}`}>
          <ProductImage uri={item.hinh_anh} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.name}>{item.ten_san_pham}</Text>
            {item.ten_bien_the ? <Text style={styles.muted}>{item.ten_bien_the}</Text> : null}
            {item.needs_variant ? <Text style={styles.error}>Chọn biến thể trước khi thanh toán.</Text> : null}
            {item.needs_variant || item.ma_bien_the ? <Pressable accessibilityRole="button" disabled={updating} onPress={() => void chooseVariant(item)}><Text style={styles.link}>{item.needs_variant ? 'Chọn biến thể' : 'Đổi biến thể'}</Text></Pressable> : null}
            {variantPicker?.item.ma_san_pham === item.ma_san_pham && variantPicker.item.ma_bien_the === item.ma_bien_the ? <View>
              {variantPicker.variants.length ? variantPicker.variants.map(variant => <Pressable key={variant.ma_bien_the} accessibilityRole="button" disabled={updating || variant.trang_thai !== 'DangBan' || Number(variant.so_luong) < item.so_luong} onPress={() => void selectVariant(variant)}><Text style={[styles.link, (variant.trang_thai !== 'DangBan' || Number(variant.so_luong) < item.so_luong) && { opacity: 0.5 }]}>{variant.ten_bien_the} · {formatCurrency(variant.gia_ban)} · Còn {variant.so_luong}</Text></Pressable>) : <Text style={styles.error}>Không có biến thể khả dụng.</Text>}
              <Pressable disabled={updating} onPress={() => setVariantPicker(null)}><Text style={styles.link}>Đóng</Text></Pressable>
            </View> : null}
            <Text style={styles.price}>{formatCurrency(item.gia_ban)}</Text>
            {item.trang_thai !== 'DangBan' || Number(item.ton_kho) < item.so_luong ? <Text style={styles.error}>Sản phẩm không bán hoặc không đủ tồn kho.</Text> : null}
            <View style={styles.quantity}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Giảm số lượng ${item.ten_san_pham}`} disabled={updating || Boolean(item.needs_variant)} style={styles.qtyButton} onPress={() => update(item, item.so_luong - 1)}><MaterialIcons name="remove" size={18} color={shop.ink} /></Pressable>
              <Text style={styles.name}>{item.so_luong}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Tăng số lượng ${item.ten_san_pham}`} disabled={updating || Boolean(item.needs_variant) || item.so_luong >= Number(item.ton_kho)} style={styles.qtyButton} onPress={() => update(item, item.so_luong + 1)}><MaterialIcons name="add" size={18} color={shop.ink} /></Pressable>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${item.ten_san_pham}`} disabled={updating} onPress={() => update(item, 0)} hitSlop={12}><MaterialIcons name="delete-outline" size={24} color={shop.muted} /></Pressable>
        </View>)}

      </>}
      {items.length > 0 ? (<View style={styles.summary}>
          <View style={styles.summaryTop}><Text style={styles.name}>Tạm tính ({items.reduce((sum, item) => sum + item.so_luong, 0)} sản phẩm)</Text>
          <Text style={styles.total}>{formatCurrency(total)}</Text></View>
          <Text style={styles.muted}>Phí giao hàng và ưu đãi được tính ở bước thanh toán.</Text>
          {needsVariant ? <Text style={styles.error}>Vui lòng chọn biến thể cho các sản phẩm được đánh dấu bên trên.</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Tiến hành thanh toán" disabled={updating || refreshing || Boolean(error) || needsVariant} style={[styles.button, (updating || refreshing || Boolean(error) || needsVariant) && { opacity: 0.5 }]} onPress={() => router.push('/checkout')}>
            <Text style={styles.buttonText}>{updating ? 'Đang cập nhật...' : 'Tiến hành thanh toán'}</Text><MaterialIcons name="arrow-forward" color="#fff" size={20} />
          </Pressable>
        </View>) : null}
    </ScrollView>
  </SafeAreaView>;
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  safe: { flex: 1, backgroundColor: shop.background }, content: { flexGrow: 1, paddingHorizontal: layout.gutter, paddingTop: 12, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  item: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: shop.surface, marginBottom: 12, borderWidth: 1, borderColor: shop.border },
  image: { width: 70, height: 70, borderRadius: 12 }, info: { flex: 1, gap: 6 }, name: { color: shop.ink, fontWeight: '700', fontSize: 14 }, price: { color: shop.primary, fontWeight: '700' },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }, qtyButton: { width: 44, minHeight: 44, backgroundColor: shop.surfaceMuted, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  error: { color: shop.danger, fontSize: 13, lineHeight: 20 }, errorBox: { backgroundColor: shop.dangerSoft, padding: space.md, borderRadius: 12, marginBottom: 12 }, link: { color: shop.primary, paddingTop: 10, fontWeight: '700' },
  summary: { backgroundColor: shop.surface, padding: layout.gutter, gap: space.sm, borderWidth: 1, borderColor: shop.border, borderRadius: radius.md, marginTop: 'auto' }, total: { color: shop.primary, fontSize: 26, fontWeight: '700' }, muted: { color: shop.muted, lineHeight: 22, fontSize: 13 },
  button: { minHeight: 54, backgroundColor: shop.action, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
