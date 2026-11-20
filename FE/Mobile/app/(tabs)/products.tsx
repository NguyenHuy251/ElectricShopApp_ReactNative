import { Pressable, Text, TextInput } from '@/components/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import api from '@/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productService } from '../../services/product.service';
import { categoryService, type Category } from '../../services/category.service';
import type { Product } from '../../types';
import { EmptyState, LoadingState, ProductCard, ScreenHeading } from '@/components/shop-ui';
import { TabHeaderActions } from '@/components/tab-header-actions';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import { getApiMessage } from '@/utils/format';

export default function ProductsScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const { category, categoryId } = useLocalSearchParams<{ category?: string; categoryId?: string }>();
  const router = useRouter();
  const setSelectedCategory = (value: number) => router.setParams({ categoryId: value ? String(value) : undefined, category: undefined });
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [categoryList,setCategoryList]=useState<Category[]>([]);
  const [filtersReady,setFiltersReady]=useState(false);
  const [filterError,setFilterError]=useState('');
  const selectedCategory = categoryList.find(c => categoryId ? String(c.ma_danh_muc) === categoryId : c.ten_danh_muc === category)?.ma_danh_muc || 0;
  const [brands,setBrands]=useState<{ma_thuong_hieu:number;ten_thuong_hieu:string}[]>([]);
  const [brand,setBrand]=useState<number>();
  const [min,setMin]=useState(''), [max,setMax]=useState('');
  const [sort,setSort]=useState('newest');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [page,setPage]=useState(0), [totalPages,setTotalPages]=useState(0), [total,setTotal]=useState(0);
  const [more,setMore]=useState(false);
  const generation=useRef(0),busy=useRef(false);
  const loadFilters = useCallback(()=>{
    let active=true;
    setFiltersReady(false); setFilterError(''); setLoading(true);
    void Promise.all([categoryService.getCategories(),api.get('/thuong-hieu')]).then(([c,b])=>{if(active){setCategoryList(c);setBrands(b.data.data || []);setFiltersReady(true);}}).catch(err=>{if(active){setFilterError(getApiMessage(err,'Chưa tải được bộ lọc.'));setLoading(false);}});
    return ()=>{active=false;};
  },[]);
  useFocusEffect(loadFilters);
  useEffect(() => {
    if (filtersReady && (categoryId || category)) {
      const resolvedId = selectedCategory ? String(selectedCategory) : undefined;
      if (category !== undefined || categoryId !== resolvedId) router.setParams({ categoryId: resolvedId, category: undefined });
    }
  }, [filtersReady, categoryId, category, selectedCategory, router]);

  const loadProducts = useCallback(async (nextSearch = search, showSpinner = false, nextPage = 1) => {
    if (!filtersReady) return;
    if(nextPage>1 && busy.current)return;
    const request=nextPage===1 ? ++generation.current : generation.current;
    busy.current=true;
    if(nextPage>1)setMore(true);
    if (showSpinner) setLoading(true);
    setError('');
    try {
      if((min && !/^\d+$/.test(min)) || (max && !/^\d+$/.test(max)) || (min && max && Number(min)>Number(max))) {setError('Nhập khoảng giá hợp lệ.');return;}
      const result = await productService.getProducts({ search: nextSearch, limit: 20, page:nextPage, sort, ma_danh_muc:selectedCategory || undefined, ma_thuong_hieu:brand, min_price:min || undefined, max_price:max || undefined });
      if(request!==generation.current)return;
      setProducts(current=>nextPage===1 ? result.data || [] : [...current,...(result.data || [])]);
      setPage(nextPage);setTotalPages(result.pagination?.totalPages || 0);setTotal(result.pagination?.total || 0);
    } catch (error) {
      if(request===generation.current)setError(getApiMessage(error, 'Không thể tải danh sách sản phẩm'));
    } finally {
      if(request===generation.current){setLoading(false);setRefreshing(false);setMore(false);busy.current=false;}
    }
  }, [search,sort,brand,min,max,filtersReady,selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(search, true), 350);
    return () => {clearTimeout(timer);generation.current++;busy.current=false;};
  }, [loadProducts, search]);

  const categories = [{ma_danh_muc:0,ten_danh_muc:'Tất cả'},...categoryList];
  const activeFilterCount = Number(Boolean(selectedCategory)) + Number(Boolean(brand)) + Number(Boolean(min || max)) + Number(sort !== 'newest');

  const visibleProducts = products;

  const refresh = () => {
    setRefreshing(true);
    loadProducts(search);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <ScreenHeading eyebrow="KHÁM PHÁ" title="Chọn cho tổ ấm" subtitle="Những tiện ích nhỏ, cho cuộc sống dễ dàng hơn." action={<TabHeaderActions />} />
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={21} color={shop.muted} />
          <TextInput
            placeholder="Tìm sản phẩm, mã hoặc danh mục"
            placeholderTextColor={shop.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />
          {search ? <Pressable onPress={() => setSearch('')}><MaterialIcons name="close" size={20} color={shop.muted} /></Pressable> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={filtersVisible ? 'Ẩn bộ lọc sản phẩm' : 'Hiện bộ lọc sản phẩm'}
          accessibilityState={{ expanded: filtersVisible }}
          onPress={() => setFiltersVisible(current => !current)}
          style={styles.filterToggle}
        >
          <MaterialIcons name="filter-list" size={20} color={shop.primary} />
          <Text style={styles.filterToggleText}>{filtersVisible ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</Text>
          {activeFilterCount > 0 ? <Text style={styles.filterCount}>{activeFilterCount} đang áp dụng</Text> : null}
          <MaterialIcons name={filtersVisible ? 'expand-less' : 'expand-more'} size={22} color={shop.primary} />
        </Pressable>

        {filtersVisible ? <View>
        <FlatList
          horizontal
          style={{ flexGrow: 0, flexShrink: 0 }}
          data={categories}
          keyExtractor={(item) => String(item.ma_danh_muc)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categories}
          renderItem={({ item }) => (
            <Pressable onPress={() => setSelectedCategory(item.ma_danh_muc)} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === item.ma_danh_muc }} style={[styles.chip, selectedCategory === item.ma_danh_muc && styles.chipActive]}>
              <Text style={[styles.chipText, selectedCategory === item.ma_danh_muc && styles.chipTextActive]}>{item.ten_danh_muc}</Text>
            </Pressable>
          )}
        />

        <ScrollView horizontal style={{flexGrow:0,flexShrink:0}} contentContainerStyle={{gap:8,paddingBottom:8}}>{[{ma_thuong_hieu:0,ten_thuong_hieu:'Mọi thương hiệu'},...brands].map(b=><Pressable key={b.ma_thuong_hieu} onPress={()=>setBrand(b.ma_thuong_hieu || undefined)} style={[styles.chip,(brand || 0)===b.ma_thuong_hieu && styles.chipActive]}><Text style={[styles.chipText,(brand || 0)===b.ma_thuong_hieu && styles.chipTextActive]}>{b.ten_thuong_hieu}</Text></Pressable>)}</ScrollView>
        <View style={styles.priceRow}>
          <View style={styles.priceField}>
            <Text style={styles.priceLabel}>Giá từ (đ)</Text>
            <TextInput accessibilityLabel="Giá từ" placeholder="Ví dụ: 100000" placeholderTextColor={shop.muted} keyboardType="number-pad" value={min} onChangeText={setMin} selectionColor={shop.primary} style={styles.priceInput} />
          </View>
          <View style={styles.priceField}>
            <Text style={styles.priceLabel}>Giá đến (đ)</Text>
            <TextInput accessibilityLabel="Giá đến" placeholder="Ví dụ: 5000000" placeholderTextColor={shop.muted} keyboardType="number-pad" value={max} onChangeText={setMax} selectionColor={shop.primary} style={styles.priceInput} />
          </View>
        </View>
        <ScrollView horizontal style={{flexGrow:0,flexShrink:0}} contentContainerStyle={styles.categories}>{[['newest','Mới nhất'],['price_asc','Giá tăng'],['price_desc','Giá giảm'],['bestseller','Bán chạy']].map(([value,label])=><Pressable key={value} onPress={()=>setSort(value)} style={[styles.chip,sort===value && styles.chipActive]}><Text style={[styles.chipText,sort===value && styles.chipTextActive]}>{label}</Text></Pressable>)}</ScrollView>
        </View> : null}
        {filterError ? <EmptyState icon="wifi-off" title="Chưa tải được danh mục" message={filterError} action="Thử lại" onAction={() => { loadFilters(); }} /> : loading ? (
          <LoadingState message="Đang tải sản phẩm..." />
        ) : error && !products.length ? (
          <EmptyState icon="wifi-off" title="Kết nối bị gián đoạn" message={error} action="Thử lại" onAction={() => loadProducts(search, true)} />
        ) : (
          <FlatList
            data={visibleProducts}
            onEndReached={()=>{if(page<totalPages && !error)void loadProducts(search,false,page+1);}}
            onEndReachedThreshold={0.3}
            ListFooterComponent={error ? <EmptyState icon="wifi-off" title="Chưa tải được trang tiếp theo" message={error} action="Thử lại" onAction={()=>void loadProducts(search,false,page+1)}/> : more ? <LoadingState message="Đang tải thêm..."/> : undefined}
            keyExtractor={(item) => String(item.ma_san_pham)}
            numColumns={2}
            columnWrapperStyle={styles.row}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={visibleProducts.length ? styles.list : styles.emptyList}
            ListHeaderComponent={visibleProducts.length ? <Text style={styles.resultCount}>{total} sản phẩm dành cho bạn</Text> : undefined}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState icon="search-off" title="Chưa tìm thấy sản phẩm" message="Thử từ khóa khác hoặc xem tất cả danh mục." action="Xem tất cả" onAction={() => { setSearch(''); setSelectedCategory(0); }} />}
            renderItem={({ item }) => <View style={styles.productCell}><ProductCard product={item} /></View>}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  filterToggle: { minHeight: layout.touch, flexDirection: 'row', alignItems: 'center', gap: space.xs, marginVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: shop.soft },
  filterToggleText: { color: shop.primary, fontSize: 13, fontWeight: '700', flex: 1 },
  filterCount: { color: shop.muted, fontSize: 12 },
  resultCount: { color: shop.muted, fontSize: 13, marginBottom: 16, marginTop: 8 },
  productCell: { flex: 1, maxWidth: '49%', marginBottom: 14 },
  safe: { flex: 1, backgroundColor: shop.background },
  container: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: 12, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  searchBox: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: shop.surface, borderRadius: radius.md, borderWidth: 1, borderColor: shop.border, paddingHorizontal: 16 },
  search: { flex: 1, color: shop.ink, fontSize: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  priceField: { flex: 1, minWidth: 0, gap: 6 },
  priceLabel: { color: shop.muted, fontSize: 12, fontWeight: '600' },
  priceInput: { minHeight: layout.touch, color: shop.ink, fontSize: 16, backgroundColor: shop.surface, borderRadius: 12, borderWidth: 1, borderColor: shop.border, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'center' },
  categories: { gap: space.xs, paddingVertical: 14 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border },
  chipActive: { backgroundColor: shop.action, borderColor: shop.primary },
  chipText: { color: shop.muted, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  row: { gap: space.sm },
});
