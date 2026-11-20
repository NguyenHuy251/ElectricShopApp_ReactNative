import { Pressable, Text, TextInput } from '@/components/ui';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingState, ScreenHeading } from '@/components/shop-ui';
import { TabHeaderActions } from '@/components/tab-header-actions';
import { addressService } from '@/services/address.service';
import { authService } from '../../services/auth.service';
import type { User } from '../../types';
import { getApiMessage, getInitials } from '../../utils/format';

export default function ProfileScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const dockHeight = useBottomTabBarHeight();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [defaultAddressText, setDefaultAddressText] = useState('Đang tải địa chỉ...');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ho_ten: '', email: '', so_dien_thoai: '', dia_chi: '' });

  const loadProfile = useCallback(async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
      setForm({
        ho_ten: response.data.ho_ten || '',
        email: response.data.email || '',
        so_dien_thoai: response.data.so_dien_thoai || '',
        dia_chi: response.data.dia_chi || '',
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setDefaultAddressText('Đang tải địa chỉ...');
    void loadProfile();
    void addressService.list().then(addresses => {
      if (active) setDefaultAddressText(addresses.find(address => address.mac_dinh)?.dia_chi || 'Chưa có địa chỉ mặc định');
    }).catch(() => {
      if (active) setDefaultAddressText('Chưa tải được địa chỉ mặc định');
    });
    return () => { active = false; };
  }, [loadProfile]));

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.ho_ten.trim() || !form.email.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên và email');
      return;
    }

    setSaving(true);
    try {
      const response = await authService.updateMe(form);
      setUser(response.data);
      setEditing(false);
      Alert.alert('Thành công', 'Thông tin tài khoản đã được cập nhật');
    } catch (error) {
      Alert.alert('Lỗi', getApiMessage(error, 'Không thể cập nhật thông tin tài khoản'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login' as any);
    Alert.alert('Thông báo', 'Đã đăng xuất');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: dockHeight + space.md }]} showsVerticalScrollIndicator={false}>
        <ScreenHeading
          eyebrow="GÓC RIÊNG CỦA BẠN"
          title="Xin chào, bạn!"
          subtitle="Mọi thông tin mua sắm, trong tầm tay."
          action={<TabHeaderActions />}
        />

        {loading ? <LoadingState message="Đang tải tài khoản..." /> : <>
        {user ? (
          <View testID="profile-info" style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{getInitials(user.ho_ten)}</Text></View>
            <View style={styles.profileInfo}>
              <Text style={styles.memberLabel}>THÀNH VIÊN ELECTRIC SHOP</Text>
              <Text style={styles.name}>{user.ho_ten}</Text>
              <Text style={styles.meta}>{user.email}</Text>
              <Text style={styles.meta}>{user.so_dien_thoai || 'Chưa có số điện thoại'}</Text>
            </View>
            <View style={styles.defaultAddress}>
              <MaterialIcons name="location-on" size={21} color={shop.primary} />
              <View style={styles.defaultAddressDetails}>
                <Text style={styles.defaultAddressLabel}>Địa chỉ giao hàng mặc định</Text>
                <Text style={styles.defaultAddressText}>{defaultAddressText}</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Chỉnh sửa thông tin tài khoản" onPress={() => setEditing(true)} style={styles.editButton}>
              <MaterialIcons name="edit" size={20} color={shop.ink} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}><Text style={styles.muted}>Chưa có dữ liệu tài khoản</Text></View>
        )}

        {editing ? (
          <View style={styles.editForm}>
            <Text style={styles.formTitle}>Cập nhật thông tin</Text>
            <TextInput style={styles.input} value={form.ho_ten} onChangeText={(value) => updateField('ho_ten', value)} placeholder="Họ tên" placeholderTextColor={shop.muted} />
            <TextInput style={styles.input} value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="Email" placeholderTextColor={shop.muted} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} value={form.so_dien_thoai} onChangeText={(value) => updateField('so_dien_thoai', value)} placeholder="Số điện thoại" placeholderTextColor={shop.muted} keyboardType="phone-pad" />
            <TextInput style={[styles.input, styles.addressInput]} value={form.dia_chi} onChangeText={(value) => updateField('dia_chi', value)} placeholder="Địa chỉ giao hàng" placeholderTextColor={shop.muted} multiline />
            <View style={styles.formActions}>
              <Pressable style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}><Text style={styles.cancelText}>Hủy</Text></Pressable>
              <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}><Text style={styles.saveText}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</Text></Pressable>
            </View>
          </View>
        ) : null}

        {user ? (
          <View style={styles.rewardSummaryCard}>
            <View style={styles.rewardSummaryLeft}>
              <View style={styles.coinCircle}>
                <MaterialIcons name="monetization-on" testID="wallet-coin" size={26} color={shop.warning} />
              </View>
              <View>
                <Text style={styles.rewardSummarySub}>Ví Xu tích lũy</Text>
                <Text style={styles.rewardSummaryValue}>
                  {user?.diem_thuong != null ? user.diem_thuong.toLocaleString('vi-VN') : '500'} Xu
                </Text>
              </View>
            </View>
            <Pressable style={styles.rewardSummaryBtn} onPress={() => router.push('/rewards' as any)}>
              <Text style={styles.rewardSummaryBtnText}>Đổi quà</Text>
              <MaterialIcons name="arrow-forward" size={16} color={shop.ink} />
            </Pressable>
          </View>
        ) : null}

        <Text style={styles.menuLabel}>MUA SẮM & GIAO NHẬN</Text>
        <View style={styles.menu}>
          <Pressable accessibilityLabel="Sổ địa chỉ" style={styles.menuItem} onPress={() => router.push('/addresses')}>
            <MaterialIcons name="location-on" size={22} color={shop.primary} /><Text style={styles.menuText}>Sổ địa chỉ</Text><MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Voucher của tôi" style={styles.menuItem} onPress={() => router.push('/vouchers')}>
            <MaterialIcons name="local-offer" size={22} color={shop.primary} /><Text style={styles.menuText}>Voucher của tôi</Text><MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push({ pathname: '/account-tools' as any, params: { section: 'password' } })}>
            <MaterialIcons name="lock-outline" size={22} color={shop.primary} />
            <Text style={styles.menuText}>Đổi mật khẩu</Text>
            <MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/orders' as any)}>
            <MaterialIcons name="receipt-long" size={22} color={shop.primary} />
            <Text style={styles.menuText}>Đơn hàng của tôi</Text>
            <MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/cart' as any)}>
            <MaterialIcons name="shopping-cart" size={22} color={shop.primary} />
            <Text style={styles.menuText}>Giỏ hàng</Text>
            <MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => router.push('/contact' as any)}>
            <MaterialIcons name="support-agent" size={22} color={shop.primary} />
            <Text style={styles.menuText}>Nhắn tin với cửa hàng</Text>
            <MaterialIcons name="chevron-right" size={23} color={shop.muted} />
          </Pressable>
        </View>

        <Text style={styles.menuLabel}>QUÀ TẶNG & GIỚI THIỆU</Text>
        <View style={styles.menu}>
          <Pressable accessibilityRole="button" style={styles.giftMenuItem} onPress={() => router.push('/rewards' as any)}>
            <View style={[styles.giftIconWrap, { backgroundColor: shop.successSoft }]}>
              <MaterialIcons name="event-available" size={22} color={shop.primary} />
            </View>
            <View style={styles.giftItemContent}>
              <View style={styles.giftTitleRow}>
                <Text style={styles.giftItemTitle}>Điểm danh & Quà tặng</Text>
                <View style={[styles.giftTagPill, { backgroundColor: shop.successSoft }]}>
                  <Text style={[styles.giftTagText, { color: shop.primary }]}>+100 Xu</Text>
                </View>
              </View>
              <Text style={styles.giftItemSub}>Nhận xu mỗi ngày, vòng quay may mắn, đổi voucher</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={shop.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.giftMenuItem, styles.giftMenuItemLast]} onPress={() => router.push('/referral' as any)}>
            <View style={[styles.giftIconWrap, { backgroundColor: shop.warningSoft }]}>
              <MaterialIcons name="card-giftcard" size={22} color={shop.warning} />
            </View>
            <View style={styles.giftItemContent}>
              <View style={styles.giftTitleRow}>
                <Text style={styles.giftItemTitle}>Mời bạn bè nhận 50.000đ</Text>
                <View style={[styles.giftTagPill, { backgroundColor: shop.warningSoft }]}>
                  <Text style={[styles.giftTagText, { color: shop.warning }]}>50K + 500X</Text>
                </View>
              </View>
              <Text style={styles.giftItemSub}>Chia sẻ mã nhận 500 Xu + Voucher cho cả hai</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={shop.muted} />
          </Pressable>
        </View>

<View style={styles.profileNote}><MaterialIcons name="spa" size={28} color={shop.primary} /><Text style={styles.profileNoteText}>Cảm ơn bạn đã để Electric Shop đồng hành cùng tổ ấm.</Text></View>
        <Pressable style={styles.logout} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color={shop.danger} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>
        </>}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  memberLabel: { color: shop.primary, fontSize: 11, letterSpacing: 1, fontWeight: '700', marginBottom: 6 },
  menuLabel: { color: shop.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginTop: 30 },
  profileNote: { backgroundColor: shop.soft, borderRadius: 22, padding: layout.gutter, flexDirection: 'row', gap: space.sm, alignItems: 'center', marginVertical: 24 },
  profileNoteText: { flex: 1, color: shop.muted, fontSize: 13, lineHeight: 21 },
  safe: { flex: 1, backgroundColor: shop.background },
  container: { flexGrow: 1, padding: layout.gutter, paddingTop: 12, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  muted: { color: shop.muted },
  card: { flexDirection: 'column', alignItems: 'center', gap: space.md, backgroundColor: shop.surface, borderRadius: radius.lg, padding: 28, borderWidth: 1, borderColor: shop.border },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: shop.action, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { alignItems: 'center', gap: 4 },
  name: { color: shop.ink, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  meta: { color: shop.muted, fontSize: 14, marginTop: 4, textAlign: 'center' },
  defaultAddress: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, padding: space.sm, backgroundColor: shop.soft, borderRadius: radius.sm },
  defaultAddressDetails: { flex: 1, minWidth: 0, gap: space.xxs },
  defaultAddressLabel: { color: shop.primary, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  defaultAddressText: { color: shop.ink, fontSize: 14, lineHeight: 20 },
  menu: { backgroundColor: shop.surface, borderRadius: radius.md, marginTop: 12, overflow: 'hidden' },
  menuItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: shop.border },
  menuText: { color: shop.ink, fontSize: 14, fontWeight: '700', flex: 1 },
  logout: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, backgroundColor: shop.surface, borderWidth: 1, borderColor: shop.border, borderRadius: radius.md, padding: 17 },
  logoutText: { color: shop.danger, fontWeight: '700' },
  keyboard: { flex: 1 },
  editButton: { position: 'absolute', right: 16, top: 16, width: 44, minHeight: 44, borderRadius: 22, backgroundColor: shop.soft, alignItems: 'center', justifyContent: 'center' },
  editForm: { backgroundColor: shop.surface, borderRadius: 22, padding: space.md, marginTop: 14, borderWidth: 1, borderColor: shop.border },
  formTitle: { color: shop.ink, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  input: { minHeight: 46, borderWidth: 1, borderColor: shop.border, borderRadius: 14, paddingHorizontal: 12, color: shop.ink, marginBottom: 10, backgroundColor: shop.surface },
  addressInput: { minHeight: 72, paddingTop: 12, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: shop.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: shop.ink, fontWeight: '700' },
  saveButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: shop.action, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.6 },
  rewardSummaryCard: { backgroundColor: shop.inverseSurface, borderRadius: 20, padding: space.md, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: shop.border },
  rewardSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  coinCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: shop.warningSoft, alignItems: 'center', justifyContent: 'center' },
  rewardSummarySub: { color: '#CAD8E4', fontSize: 12, fontWeight: '600' },
  rewardSummaryValue: { color: shop.inverseAccent, fontSize: 18, fontWeight: '700', marginTop: 2 },
  rewardSummaryBtn: { backgroundColor: shop.accent, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  rewardSummaryBtnText: { color: shop.ink, fontSize: 12, fontWeight: '700' },
  menuSubText: { color: shop.muted, fontSize: 12, marginTop: 2 },
  giftMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: shop.surfaceMuted,
  },
  giftMenuItemLast: {
    borderBottomWidth: 0,
  },
  giftIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  giftTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  giftItemTitle: {
    color: shop.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  giftTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  giftTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  giftItemSub: {
    color: shop.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
