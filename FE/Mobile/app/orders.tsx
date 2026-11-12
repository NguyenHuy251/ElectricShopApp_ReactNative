import { OrderProgress, Pressable, Text } from '@/components/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeading } from '@/components/shop-ui';
import { CancelOrderButton } from '@/components/cancel-order-button';
import { shop, layout, radius, space } from '@/constants/shop-theme';
import { orderService } from '@/services/order.service';
import type { Order } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

const statusLabel: Record<string, string> = {
  ChoXacNhan: 'Chờ xác nhận',
  DaXacNhan: 'Đã xác nhận',
  DangGiao: 'Đang giao',
  DaGiao: 'Đã giao',
  DaHuy: 'Đã hủy',
};

export default function OrdersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    setError('');
    try {
      const result = await orderService.getOrders();
      setOrders(result.data || []);
    } catch {
      setError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]));

  const visibleOrders = orders.filter(order => filter === 'all' || order.trang_thai === filter);
  const statusColors = (status: string) => status === 'DaHuy' ? { background: '#FBEDEC', foreground: shop.danger } : status === 'DaGiao' ? { background: shop.soft, foreground: shop.primary } : status === 'DangGiao' ? { background: '#E8EFF9', foreground: '#3A6295' } : { background: '#F8EEDB', foreground: '#916B24' };

  const refresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <ScreenHeading eyebrow="HÀNH TRÌNH MUA SẮM" title="Đơn hàng của bạn" subtitle="Theo dõi từng món đồ đang đến với tổ ấm." icon="receipt-long" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ gap: 8 }}>
          {[['all', 'Tất cả'], ...Object.entries(statusLabel)].map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.activeFilter]}><Text style={[styles.filterText, filter === key && { color: '#fff' }]}>{label}</Text></Pressable>)}
        </ScrollView>
        {loading ? (
          <LoadingState message="Đang tải đơn hàng..." />
        ) : error ? <EmptyState icon="wifi-off" title="Chưa tải được đơn hàng" message={error} action="Thử lại" onAction={loadOrders} /> : (
          <FlatList
            data={visibleOrders}
            keyExtractor={(item) => String(item.ma_don_hang)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
            contentContainerStyle={visibleOrders.length ? styles.list : styles.emptyList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<EmptyState icon="receipt-long" title="Chưa có đơn hàng" message="Đơn hàng thuộc trạng thái này sẽ xuất hiện tại đây." />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.heading}>Đơn #{item.ma_don_hang}</Text>
                    <Text style={styles.date}>{formatDate((item as any).ngay_dat)}</Text>
                  </View>
                  <View style={[styles.status, { backgroundColor: statusColors(item.trang_thai).background }]}><Text style={[styles.statusText, { color: statusColors(item.trang_thai).foreground }]}>{statusLabel[item.trang_thai] || item.trang_thai}</Text></View>
                </View>
                <OrderProgress status={item.trang_thai} /><View style={styles.infoLine}><MaterialIcons name="location-on" size={17} color={shop.muted} /><Text numberOfLines={1} style={styles.infoText}>{item.dia_chi_giao_hang}</Text></View>
                <View style={styles.infoLine}><MaterialIcons name="inventory-2" size={17} color={shop.muted} /><Text style={styles.infoText}>{item.items?.length || 0} sản phẩm</Text></View>
                <View style={styles.totalRow}><Text style={styles.totalLabel}>Tổng thanh toán</Text><Text style={styles.total}>{formatCurrency(item.tong_tien)}</Text></View>
                <Pressable style={styles.detailButton} onPress={() => router.push(`/order/${item.ma_don_hang}` as any)}>
                  <Text style={styles.detailButtonText}>Xem chi tiết đơn hàng</Text>
                  <MaterialIcons name="chevron-right" size={20} color={shop.primary} />
                </Pressable>
                {item.trang_thai === 'ChoXacNhan' ? (
                  <CancelOrderButton orderId={item.ma_don_hang} onCanceled={loadOrders} />
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filters: { flexGrow: 0, flexShrink: 0, marginBottom: 22 },
  filter: { paddingHorizontal: 16, minHeight: 44, borderRadius: 12, backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border, justifyContent: 'center' },
  activeFilter: { backgroundColor: shop.primary, borderColor: shop.primary },
  filterText: { color: shop.muted, fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: shop.border, marginTop: 18, paddingTop: 15, gap: space.xs },
  totalLabel: { color: shop.muted, fontSize: 12 },
  safe: { flex: 1, backgroundColor: shop.background },
  container: { flex: 1, paddingHorizontal: layout.gutter, paddingTop: 12, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: shop.surface, borderRadius: radius.md, padding: layout.gutter, marginBottom: 20, borderWidth: 1, borderColor: shop.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  heading: { color: shop.ink, fontWeight: '700', fontSize: 16 },
  date: { color: shop.muted, marginTop: 4, fontSize: 12 },
  status: { backgroundColor: shop.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { color: shop.primary, fontSize: 12, fontWeight: '700' },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  infoText: { color: shop.muted, flex: 1, fontSize: 13 },
  total: { color: shop.ink, fontSize: 22, fontWeight: '700' },
  detailButton: { minHeight: layout.touch, borderTopWidth: 1, borderColor: shop.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 12 },
  detailButtonText: { color: shop.primary, fontSize: 13, fontWeight: '700' },
  cancelButton: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: '#F0CACA', backgroundColor: '#FFF7F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 16 },
  cancelButtonText: { color: shop.danger, fontSize: 13, fontWeight: '700' },
});
