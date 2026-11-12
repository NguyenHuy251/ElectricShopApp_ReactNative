import { Pressable, Text } from '@/components/ui';
import { shop, layout, radius, space } from '@/constants/shop-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState } from '../components/shop-ui';
import { contactService } from '../services/contact.service';
import type { Contact } from '../types';
import { formatDate, getApiMessage } from '../utils/format';

export default function ContactHistoryScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const { data } = await contactService.getMine();
      if (!active.current) return;
      setContacts(data.data || []);
      setError('');
    } catch (err) {
      if (!active.current) return;
      setError(getApiMessage(err, 'Không thể tải phản hồi của bạn.'));
    } finally {
      busy.current = false;
      if (active.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    active.current = true; void load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 15000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active.current = false; clearInterval(timer); listener.remove(); };
  }, [load]));

  if (loading) return <SafeAreaView style={styles.safe}><LoadingState message="Đang tải liên hệ của bạn..." /></SafeAreaView>;
  if (error && !contacts.length) return <SafeAreaView style={styles.safe}><EmptyState icon="forum" title="Chưa tải được liên hệ" message={error} action="Thử lại" onAction={load} /></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['bottom']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}>
      <Pressable accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={22} color={shop.ink} /><Text style={styles.backText}>Tài khoản</Text></Pressable>
      <Text style={styles.eyebrow}>HỖ TRỢ KHÁCH HÀNG</Text>
      <Text style={styles.title}>Phản hồi của tôi</Text>
      <Text style={styles.subtitle}>Theo dõi các câu hỏi và trả lời từ cửa hàng.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!contacts.length ? <View style={styles.empty}><MaterialIcons name="forum" size={30} color={shop.primary} /><Text style={styles.emptyTitle}>Bạn chưa gửi liên hệ nào</Text><Pressable onPress={() => router.push('/contact')}><Text style={styles.link}>Gửi liên hệ đầu tiên</Text></Pressable></View> : contacts.map(contact => <View key={contact.ma_lien_he} style={styles.card}>
        <View style={styles.row}><Text style={styles.subject}>{contact.tieu_de}</Text><View style={[styles.badge, contact.trang_thai === 'DaPhanHoi' ? styles.replied : styles.waiting]}><Text style={styles.badgeText}>{contact.trang_thai === 'DaPhanHoi' ? 'Đã phản hồi' : 'Chờ phản hồi'}</Text></View></View>
        <Text style={styles.date}>{contact.ngay_gui ? formatDate(contact.ngay_gui) : ''}</Text>
        <Text style={styles.body}>{contact.noi_dung}</Text>
        {contact.phan_hoi ? <View style={styles.reply}><Text style={styles.replyLabel}>Phản hồi từ cửa hàng</Text><Text style={styles.body}>{contact.phan_hoi}</Text><Text style={styles.date}>{contact.ngay_phan_hoi ? formatDate(contact.ngay_phan_hoi) : ''}</Text></View> : <Text style={styles.muted}>Cửa hàng sẽ phản hồi sớm.</Text>}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.background },
  content: { padding: layout.gutter, gap: 14, paddingBottom: 36, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 40 },
  backText: { color: shop.ink, fontSize: 14, fontWeight: '700' },
  eyebrow: { color: shop.primary, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: shop.ink, fontSize: 28, fontWeight: '700' },
  subtitle: { color: shop.muted, fontSize: 14, lineHeight: 21 },
  card: { backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border, borderRadius: radius.md, padding: layout.gutter, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  subject: { flex: 1, color: shop.ink, fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  waiting: { backgroundColor: '#F8EEDB' },
  replied: { backgroundColor: shop.soft },
  badgeText: { color: shop.ink, fontSize: 12, fontWeight: '700' },
  date: { color: shop.muted, fontSize: 12 },
  body: { color: '#556B80', fontSize: 14, lineHeight: 22 },
  reply: { backgroundColor: shop.soft, borderLeftWidth: 3, borderColor: shop.primary, borderRadius: 8, padding: space.md, gap: space.xs, marginTop: 12 },
  replyLabel: { color: shop.primary, fontSize: 12, fontWeight: '700' },
  muted: { color: shop.muted, fontSize: 13 },
  error: { color: '#A52D2D', fontSize: 13 },
  empty: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { color: shop.ink, fontSize: 15, fontWeight: '700' },
  link: { color: shop.primary, fontSize: 13, fontWeight: '700', paddingVertical: 5 },
});
