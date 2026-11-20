import { Pressable, Text } from '@/components/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabHeaderActions } from '@/components/tab-header-actions';
import { productService } from '../../services/product.service';
import { categoryService, type Category } from '../../services/category.service';
import type { Product } from '../../types';
import { EmptyState, LoadingState, ProductImage, ProductCard } from '@/components/shop-ui';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import { getApiMessage } from '@/utils/format';
import { getCategoryIcon } from '@/constants/category-icons';


export default function HomeScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const categoryColors = [shop.infoSoft, shop.warningSoft, shop.violetSoft, shop.successSoft];
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHome = useCallback(async () => {
    setError('');
    const categoriesRequest = categoryService.getCategories().then(data => {
      setCategories(data); setCategoryError('');
    }).catch(err => {
      setCategories([]); setCategoryError(getApiMessage(err, 'Chưa tải được danh mục.'));
    });
    try {
      const response = await productService.getProducts({ limit: 4 });
      setProducts(response.data || []);
    } catch (error) {
      setError(getApiMessage(error, 'Không thể tải danh sách sản phẩm'));
    } finally {
      setLoading(false);
    }

    await categoriesRequest;
  }, []);

  useFocusEffect(useCallback(() => {
    loadHome();
  }, [loadHome]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.brandRow}><View style={styles.brandBolt}><MaterialIcons name="bolt" size={21} color={shop.primary} /></View><Text style={styles.eyebrow}>ElectricShop</Text></View>
            <Text style={styles.heading}>Nhà tiện nghi, sống thảnh thơi.</Text>
          </View>
          <TabHeaderActions />
        </View>

        <Link href="/products" asChild><Pressable style={styles.searchBar}><MaterialIcons name="search" size={22} color={shop.muted} /><Text style={styles.searchText}>Bạn đang tìm thiết bị gì?</Text><View style={styles.searchArrow}><MaterialIcons name="tune" size={18} color={shop.primary} /></View></Pressable></Link>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>THIẾT BỊ TỐT · SỐNG TIỆN NGHI</Text>
            <Text style={styles.heroTitle}>{'Chọn tiện nghi.\nSống trọn vẹn.'}</Text>
            <View style={styles.heroDetails}>
              <Text style={styles.heroText}>Khám phá thiết bị gia dụng cho nhịp sống của bạn.</Text>
              <View style={styles.featureVisual} pointerEvents="none">{products[0] ? <ProductImage uri={products[0].hinh_anh} style={styles.featureImage} /> : <MaterialCommunityIcons name="home-outline" size={48} color={shop.primary} />}</View>
            </View>
            <Link href="/products" asChild>
              <Pressable style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Khám phá ngay</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </Link>
          </View>
        </View>

        <SectionHeader title="Góc nhà của bạn" action="Xem tất cả" href="/products" />
        {categoryError ? <Text style={styles.searchText}>{categoryError}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {categories.map((item, index) => ({ ...item, icon: getCategoryIcon(item.ten_danh_muc), color: categoryColors[index % categoryColors.length] })).map((category) => (
            <Link href={{ pathname: '/products', params: { categoryId: String(category.ma_danh_muc) } }} key={category.ma_danh_muc} asChild>
              <Pressable style={styles.category}>
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}><MaterialCommunityIcons name={category.icon} size={28} color={shop.ink} /></View>
                <Text style={styles.categoryLabel}>{category.ten_danh_muc}</Text>
              </Pressable>
            </Link>
          ))}
        </ScrollView>

        <SectionHeader title="Sản phẩm nổi bật" action="Xem thêm" href="/products" />
        {loading ? <LoadingState message="Đang chọn sản phẩm cho bạn..." /> : error ? <EmptyState icon="wifi-off" title="Chưa tải được sản phẩm" message={error} action="Thử lại" onAction={loadHome} /> : !products.length ? <EmptyState icon="inventory-2" title="Sản phẩm đang được cập nhật" /> : (
          <View style={styles.productRow}>{products.map(product => <View key={product.ma_san_pham} style={styles.productCell}><ProductCard product={product} /></View>)}</View>
        )}
        <View style={styles.memberIntro}><Text style={styles.sectionTitle}>Dành cho thành viên</Text><Text style={styles.searchText}>Tích lũy, chia sẻ và tận hưởng ưu đãi của bạn.</Text></View>
        {/* Gamification Action Strip */}
        <View style={styles.rewardStrip}>
          <Link href={'/rewards' as any} asChild>
            <Pressable style={styles.rewardActionBtn}>
              <View style={[styles.rewardIconWrap, { backgroundColor: shop.successSoft }]}>
                <MaterialIcons name="event-available" size={24} color={shop.primary} />
                <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>+100X</Text></View>
              </View>
              <Text style={styles.rewardActionText}>Điểm danh</Text>
            </Pressable>
          </Link>

          <Link href={'/referral' as any} asChild>
            <Pressable style={styles.rewardActionBtn}>
              <View style={[styles.rewardIconWrap, { backgroundColor: shop.warningSoft }]}>
                <MaterialIcons name="group-add" size={24} color={shop.warning} />
                <View style={[styles.miniBadge, { backgroundColor: '#EA580C' }]}><Text style={styles.miniBadgeText}>50K</Text></View>
              </View>
              <Text style={styles.rewardActionText}>Mời bạn bè</Text>
            </Pressable>
          </Link>

          <Link href={'/rewards' as any} asChild>
            <Pressable style={styles.rewardActionBtn}>
              <View style={[styles.rewardIconWrap, { backgroundColor: shop.violetSoft }]}>
                <MaterialIcons name="attractions" size={24} color={shop.violet} />
                <View style={[styles.miniBadge, { backgroundColor: '#8B5CF6' }]}><Text style={styles.miniBadgeText}>Hot</Text></View>
              </View>
              <Text style={styles.rewardActionText}>Vòng quay</Text>
            </Pressable>
          </Link>

          <Link href="/vouchers" asChild>
            <Pressable style={styles.rewardActionBtn}>
              <View style={[styles.rewardIconWrap, { backgroundColor: shop.infoSoft }]}>
                <MaterialIcons name="local-offer" size={24} color={shop.info} />
              </View>
              <Text style={styles.rewardActionText}>Voucher</Text>
            </Pressable>
          </Link>
        </View>

        {/* Retention Banner */}
        <Link href={'/rewards' as any} asChild>
          <Pressable style={styles.retentionBanner}>
            <View style={styles.retentionIconWrap}>
              <MaterialIcons name="stars" size={30} color={shop.inverseAccent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.retentionTitle}>Tích lũy mỗi ngày, thêm ưu đãi</Text>
              <Text style={styles.retentionSub}>Quà tặng dành cho thành viên</Text>
            </View>
            <View style={styles.retentionCta}>
              <Text style={styles.retentionCtaText}>Khám phá</Text>
              <MaterialIcons name="chevron-right" size={18} color={shop.ink} />
            </View>
          </Pressable>
        </Link>

        <Link href="/products" asChild><Pressable style={styles.bottomBanner}><View style={{ flex: 1 }}><Text style={styles.bottomTitle}>Tìm món đồ hợp với nhà bạn</Text><Text style={styles.bottomText}>Khám phá tất cả sản phẩm</Text></View><MaterialIcons name="arrow-circle-right" size={30} color={shop.primary} /></Pressable></Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, action, href }: { title: string; action: string; href: '/products' }) {
  const { styles } = useShopStyles(makeStyles);
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Link href={href} style={styles.sectionAction}>{action}</Link>
    </View>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  heroDetails: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  featureVisual: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: shop.surface, borderRadius: radius.md, overflow: 'hidden' },
  featureImage: { width: '100%', height: '100%' },
  memberIntro: { marginTop: space.xl, gap: space.xs },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  brandBolt: { width: 30, height: 34, borderRadius: radius.sm, backgroundColor: shop.soft, alignItems: 'center', justifyContent: 'center' },
  applianceScene: { position: 'absolute', right: 12, bottom: 25, width: 116, height: 146, opacity: 0.6 },
  applianceTall: { position: 'absolute', top: 0, right: 0, height: 120, width: 78, backgroundColor: '#315873', borderWidth: 1, borderColor: shop.border, borderRadius: 14, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '7deg' }] },
  applianceBase: { width: 36, height: 3, backgroundColor: shop.border, marginTop: 4, borderRadius: 3 },
  applianceSmall: { position: 'absolute', bottom: 0, left: 0, width: 70, height: 79, borderRadius: 14, borderWidth: 1, borderColor: shop.border, backgroundColor: '#254962', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  sceneDot: { position: 'absolute', width: 9, height: 9, backgroundColor: shop.accent, borderRadius: 5, left: 3, top: 15 },
  safeArea: { flex: 1, backgroundColor: shop.background },
  content: { paddingHorizontal: layout.gutter, paddingBottom: 28, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingTop: 20, paddingBottom: 22 },
  eyebrow: { color: shop.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.8 },
  heading: { color: shop.muted, fontSize: 12, marginTop: 8 },
  searchBar: { backgroundColor: shop.surface, borderRadius: 18, borderWidth: 1, borderColor: shop.border, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginBottom: 20 },
  searchText: { color: shop.muted, fontSize: 13, flex: 1 },
  searchArrow: { backgroundColor: shop.soft, width: 32, height: 32, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: shop.soft, minHeight: 285, borderRadius: radius.lg, padding: space.lg, overflow: 'hidden' },
  heroCircle: { position: 'absolute', right: -90, bottom: -65, width: 260, height: 260, borderRadius: 130, backgroundColor: shop.soft },
  heroCopy: { width: '100%' },
  heroKicker: { color: shop.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  heroTitle: { color: shop.ink, fontSize: 30, lineHeight: 39, fontWeight: '700', letterSpacing: -1, marginTop: 18 },
  heroText: { flex: 1, color: shop.muted, fontSize: 14, lineHeight: 22 },
  heroButton: { alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: shop.action, paddingHorizontal: 16, minHeight: layout.touch, borderRadius: 14, marginTop: 20 },
  heroButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  heroIcon: { position: 'absolute', right: -18, bottom: 24, transform: [{ rotate: '-12deg' }], opacity: 0.35 },
  promise: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 },
  promiseText: { color: shop.muted, fontSize: 12, flexShrink: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 16 },
  sectionTitle: { color: shop.ink, fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  sectionAction: { color: shop.primary, fontSize: 12, fontWeight: '700', paddingVertical: 8 },
  categoryRow: { gap: space.md, paddingBottom: 2 },
  category: { alignItems: 'center', width: 72 },
  categoryIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { color: shop.ink, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  productCell: { width: '48%', flexGrow: 1, maxWidth: '49%' },
  bottomBanner: { backgroundColor: shop.soft, padding: layout.gutter, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24 },
  bottomTitle: { color: shop.ink, fontSize: 14, fontWeight: '700' },
  bottomText: { color: shop.muted, fontSize: 12, marginTop: 5 },
  rewardStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, marginTop: 8, borderBottomWidth: 1, borderColor: shop.border },
  rewardActionBtn: { alignItems: 'center', flex: 1 },
  rewardIconWrap: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  miniBadge: { display: 'none' },
  miniBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  rewardActionText: { color: shop.ink, fontSize: 12, fontWeight: '700', marginTop: 6 },
  retentionBanner: { backgroundColor: shop.surface, borderRadius: radius.md, padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 16, borderWidth: 1, borderColor: shop.border },
  retentionIconWrap: { width: 38, minHeight: 44, borderRadius: 12, backgroundColor: shop.border, alignItems: 'center', justifyContent: 'center' },
  retentionTitle: { color: shop.ink, fontSize: 12, fontWeight: '700' },
  retentionSub: { color: shop.muted, fontSize: 12, marginTop: 3 },
  retentionCta: { backgroundColor: shop.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 2 },
  retentionCtaText: { color: shop.ink, fontSize: 12, fontWeight: '700' },
});
