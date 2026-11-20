import { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, Text } from '@/components/ui';
import { EmptyState, LoadingState } from '@/components/shop-ui';
import { useNotifications } from '@/components/notification-provider';
import {
  notificationService,
  type ShopNotification,
} from '@/services/notification.service';
import {
  notificationDestination,
  notificationTitle,
} from '@/utils/notifications';
import { getApiMessage } from '@/utils/format';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, space, type ShopPalette } from '@/constants/shop-theme';

export default function NotificationsScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const router = useRouter();
  const {
    notifications: unread,
    inbox,
    refresh: refreshCounts,
  } = useNotifications();
  const [rows, setRows] = useState<ShopNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [older, setOlder] = useState(false);
  const [more, setMore] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false),
    fetching = useRef(false),
    mutation = useRef(false);
  const firstLoad = useRef(true),
    topId = useRef(0);
  const revision = useRef(0);

  const load = useCallback(
    async (before?: number, pull = false) => {
      if (fetching.current || mutation.current) return;
      fetching.current = true;
      const version = revision.current;
      if (pull) setRefreshing(true);
      if (before) setOlder(true);
      try {
        const incoming = await notificationService.list(before);
        if (!active.current || revision.current !== version) return;
        setRows((current) =>
          [
            ...new Map(
              [...current, ...incoming].map((row) => [row.ma_thong_bao, row]),
            ).values(),
          ].sort((a, b) => b.ma_thong_bao - a.ma_thong_bao),
        );
        topId.current = Math.max(
          topId.current,
          ...incoming.map((row) => row.ma_thong_bao),
        );
        if (before || firstLoad.current) setMore(incoming.length === 50);
        firstLoad.current = false;
        setError('');
        void refreshCounts();
      } catch (e) {
        if (active.current && revision.current === version)
          setError(
            getApiMessage(e, 'Chưa tải được thông báo. Vui lòng thử lại.'),
          );
      } finally {
        fetching.current = false;
        if (active.current) {
          setLoading(false);
          setRefreshing(false);
          setOlder(false);
        }
      }
    },
    [refreshCounts],
  );

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void load();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') void load();
      }, 10000);
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
      });
      return () => {
        active.current = false;
        clearInterval(timer);
        listener.remove();
      };
    }, [load]),
  );

  const open = async (row: ShopNotification) => {
    if (mutation.current) return;
    revision.current++;
    mutation.current = true;
    setActing(true);
    try {
      if (!row.da_doc) await notificationService.read(row.ma_thong_bao);
      if (!active.current) return;
      setRows((current) =>
        current.map((item) =>
          item.ma_thong_bao === row.ma_thong_bao
            ? { ...item, da_doc: true }
            : item,
        ),
      );
      setError('');
      void refreshCounts();
      const destination = notificationDestination(row);
      if (destination === 'order')
        router.push({
          pathname: '/order/[id]',
          params: { id: String(row.ma_don_hang) },
        });
      else if (destination === 'contact') router.push('/contact');
    } catch (e) {
      if (active.current)
        setError(getApiMessage(e, 'Chưa thể đánh dấu thông báo đã đọc.'));
    } finally {
      mutation.current = false;
      setActing(false);
    }
  };

  const readAll = async () => {
    if (mutation.current || !topId.current) return;
    revision.current++;
    mutation.current = true;
    setActing(true);
    const through = topId.current;
    try {
      await notificationService.readAll(through);
      if (!active.current) return;
      setRows((current) =>
        current.map((row) =>
          row.ma_thong_bao <= through ? { ...row, da_doc: true } : row,
        ),
      );
      setError('');
      void refreshCounts();
    } catch (e) {
      if (active.current)
        setError(getApiMessage(e, 'Chưa thể đánh dấu thông báo đã đọc.'));
    } finally {
      mutation.current = false;
      setActing(false);
    }
  };

  const visible =
    filter === 'unread' ? rows.filter((row) => !row.da_doc) : rows;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(undefined, true)}
            tintColor={shop.primary}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialIcons
              name="notifications-none"
              size={28}
              color={shop.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heading}>Cập nhật dành cho bạn</Text>
            <Text style={styles.caption}>
              {unread
                ? `${unread} thông báo chưa đọc`
                : 'Theo dõi đơn hàng và hỗ trợ từ cửa hàng.'}
            </Text>
          </View>
        </View>
        {inbox > 0 ? (
          <Pressable
            accessibilityLabel={`Mở hộp thư, ${inbox} tin nhắn chưa đọc`}
            style={styles.inbox}
            onPress={() => router.push('/contact')}
          >
            <View style={styles.heroIcon}>
              <MaterialIcons
                name="chat-bubble-outline"
                size={23}
                color={shop.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Cửa hàng đã nhắn cho bạn</Text>
              <Text style={styles.caption}>
                {inbox} tin nhắn chưa đọc · Mở hộp thư
              </Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={shop.primary}
            />
          </Pressable>
        ) : null}
        <View style={styles.toolbar}>
          <View style={styles.filters}>
            {(['all', 'unread'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === value }}
                style={[styles.filter, filter === value && styles.filterActive]}
                onPress={() => setFilter(value)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === value && { color: '#fff' },
                  ]}
                >
                  {value === 'all' ? 'Tất cả' : 'Chưa đọc'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        {unread > 0 && rows.length > 0 ? (
          <Pressable
            accessibilityLabel="Đánh dấu tất cả thông báo đã đọc"
            disabled={acting || loading || refreshing || older}
            onPress={() => void readAll()}
            style={styles.readAll}
          >
            <MaterialIcons name="done-all" size={18} color={shop.primary} />
            <Text style={styles.link}>Đọc tất cả thông báo</Text>
          </Pressable>
        ) : null}
        {error ? (
          <View style={styles.error}>
            <Text
              accessibilityRole="alert"
              style={{ color: shop.danger, flex: 1 }}
            >
              {error}
            </Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.link}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <LoadingState message="Đang tải thông báo..." />
        ) : !visible.length && !error ? (
          <EmptyState
            icon="notifications-none"
            title={
              filter === 'unread'
                ? unread > 0 && more
                  ? 'Còn thông báo chưa đọc trong lịch sử'
                  : 'Bạn đã xem hết thông báo'
                : 'Chưa có thông báo'
            }
            message={
              filter === 'unread'
                ? unread > 0 && more
                  ? 'Nhấn Tải thông báo trước để xem thêm.'
                  : 'Các cập nhật mới sẽ xuất hiện tại đây.'
                : 'Thông tin đơn hàng và cập nhật từ cửa hàng sẽ được lưu tại đây.'
            }
          />
        ) : null}
        {visible.map((row) => (
          <Pressable
            key={row.ma_thong_bao}
            accessibilityLabel={`${notificationTitle(row)}, ${row.da_doc ? 'đã đọc' : 'chưa đọc'}`}
            disabled={acting || refreshing || older}
            style={[styles.card, !row.da_doc && styles.unread]}
            onPress={() => void open(row)}
          >
            <View
              style={[
                styles.cardIcon,
                !row.da_doc && { backgroundColor: shop.soft },
              ]}
            >
              <MaterialIcons
                name={
                  row.ma_don_hang
                    ? 'local-shipping'
                    : notificationDestination(row) === 'contact'
                      ? 'chat-bubble-outline'
                      : 'notifications-none'
                }
                size={23}
                color={shop.primary}
              />
            </View>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { flex: 1 }]}>
                  {notificationTitle(row)}
                </Text>
                {!row.da_doc ? (
                  <View accessibilityLabel="Chưa đọc" style={styles.dot} />
                ) : null}
              </View>
              <Text style={styles.body}>{row.noi_dung}</Text>
              {row.ngay_tao ? (
                <Text style={styles.time}>
                  {new Date(row.ngay_tao).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </Text>
              ) : null}
              <Text style={styles.link}>
                {notificationDestination(row) === 'order'
                  ? 'Xem đơn hàng'
                  : notificationDestination(row) === 'contact'
                    ? 'Mở hộp thư'
                    : row.da_doc
                      ? 'Đã đọc'
                      : 'Đánh dấu đã đọc'}
              </Text>
            </View>
          </Pressable>
        ))}
        {more && rows.length > 0 ? (
          <Pressable
            disabled={older || acting}
            style={styles.loadMore}
            onPress={() => void load(rows[rows.length - 1].ma_thong_bao)}
          >
            <Text style={styles.link}>
              {older ? 'Đang tải...' : 'Tải thông báo trước'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.background },
  content: {
    padding: layout.gutter,
    gap: space.md,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingBottom: 32,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: shop.soft,
  },
  heading: { fontSize: 21, fontWeight: '700', lineHeight: 29 },
  caption: { fontSize: 13, lineHeight: 21, color: shop.muted, marginTop: 4 },
  inbox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.primary,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center' },
  filters: { flexDirection: 'row', gap: 8 },
  filter: {
    paddingHorizontal: 18,
    minHeight: 42,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.border,
  },
  filterActive: { backgroundColor: shop.action, borderColor: shop.primary },
  filterText: { fontSize: 13, color: shop.muted, fontWeight: '600' },
  readAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    minHeight: 40,
  },
  link: {
    fontSize: 12,
    lineHeight: 18,
    color: shop.primary,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.border,
  },
  unread: { borderColor: shop.border, backgroundColor: shop.soft },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: shop.background,
  },
  copy: { flex: 1, gap: 7 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 21, color: shop.muted },
  time: { fontSize: 11, lineHeight: 17, color: shop.muted },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: shop.action },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  error: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: shop.dangerSoft,
  },
});
