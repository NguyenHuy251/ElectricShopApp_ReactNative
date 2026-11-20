import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useShopStyles } from '@/components/shop-appearance';
import { EmptyState, LoadingState } from '@/components/shop-ui';
import { Pressable, SectionIntro, Text, TextInput } from '@/components/ui';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import { addressService, type AddressInput, type ShippingAddress } from '@/services/address.service';
import { getApiMessage } from '@/utils/format';

const emptyAddress: AddressInput = { ho_ten: '', so_dien_thoai: '', dia_chi: '', mac_dinh: false };
const fields = [
  { key: 'ho_ten', label: 'Họ tên người nhận', placeholder: 'Nhập họ và tên', limit: 100 },
  { key: 'so_dien_thoai', label: 'Số điện thoại', placeholder: 'Ví dụ 0912345678', limit: 20 },
  { key: 'dia_chi', label: 'Địa chỉ giao hàng', placeholder: 'Số nhà, đường, phường/xã, tỉnh/thành phố', limit: 255 },
] as const;

export default function AddressesScreen() {
  const { shop, styles } = useShopStyles(makeStyles);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const saving = useRef(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<{ id?: number; address: AddressInput } | null>(null);
  const [deleteId, setDeleteId] = useState<number>();

  const load = useCallback(() => addressService.list()
    .then(setAddresses)
    .catch(err => setLoadError(getApiMessage(err, 'Chưa tải được sổ địa chỉ.')))
    .finally(() => setLoading(false)), []);

  useEffect(() => { void load(); }, [load]);

  const reload = () => {
    setLoading(true);
    setLoadError('');
    return load();
  };

  const openEditor = (saved?: ShippingAddress) => {
    setDeleteId(undefined);
    setError('');
    setNotice('');
    setEditor(saved ? {
      id: saved.ma_dia_chi,
      address: { ho_ten: saved.ho_ten, so_dien_thoai: saved.so_dien_thoai, dia_chi: saved.dia_chi, mac_dinh: Boolean(saved.mac_dinh) },
    } : { address: emptyAddress });
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const mutate = async (action: () => Promise<void>, message: string) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setEditor(null);
      setDeleteId(undefined);
      setNotice(message);
      await reload();
    } catch (err) {
      setError(getApiMessage(err, 'Chưa thể cập nhật địa chỉ.'));
      scroll.current?.scrollTo({ y: 0, animated: false });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const save = () => {
    if (!editor) return;
    const address = {
      ...editor.address,
      ho_ten: editor.address.ho_ten.trim(),
      so_dien_thoai: editor.address.so_dien_thoai.replace(/[\s().-]/g, '').replace(/^\+84/, '0'),
      dia_chi: editor.address.dia_chi.trim(),
    };
    if (address.ho_ten.length < 2) { setError('Nhập họ tên từ 2 đến 100 ký tự.'); return; }
    if (!/^0[35789]\d{8}$/.test(address.so_dien_thoai)) { setError('Nhập số điện thoại di động Việt Nam hợp lệ.'); return; }
    if (address.dia_chi.length < 10) { setError('Nhập địa chỉ đầy đủ từ 10 đến 255 ký tự.'); return; }
    void mutate(() => addressService.save(address, editor.id), 'Đã lưu địa chỉ.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <SectionIntro title="Địa chỉ giao hàng" description="Lưu địa chỉ của bạn và chọn nơi nhận hàng khi thanh toán." />
          {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {loading ? <LoadingState message="Đang tải sổ địa chỉ..." /> : null}
          {loadError ? <EmptyState icon="wifi-off" title="Chưa tải được sổ địa chỉ" message={loadError} action="Thử lại" onAction={reload} /> : null}
          {!loading && !loadError ? <>
            {editor ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>{editor.id === undefined ? 'Thêm địa chỉ' : 'Sửa địa chỉ'}</Text>
                {fields.map(({ key, label, placeholder, limit }) => (
                  <View key={key} style={styles.field}>
                    <Text style={styles.label}>{label}</Text>
                    <TextInput
                      accessibilityLabel={label}
                      placeholder={placeholder}
                      value={editor.address[key]}
                      editable={!busy}
                      maxLength={limit}
                      keyboardType={key === 'so_dien_thoai' ? 'phone-pad' : 'default'}
                      multiline={key === 'dia_chi'}
                      onChangeText={value => {
                        setError('');
                        setEditor(current => current && { ...current, address: { ...current.address, [key]: value } });
                      }}
                      style={[styles.input, key === 'dia_chi' && styles.multiline]}
                    />
                  </View>
                ))}
                {!addresses.length || addresses.some(address => address.ma_dia_chi === editor.id && address.mac_dinh) ? (
                  <Text style={styles.muted}>{addresses.length ? 'Đây là địa chỉ mặc định.' : 'Địa chỉ đầu tiên sẽ được dùng mặc định.'}</Text>
                ) : (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Đặt làm địa chỉ mặc định"
                    aria-checked={editor.address.mac_dinh}
                    style={styles.check}
                    disabled={busy}
                    onPress={() => setEditor(current => current && { ...current, address: { ...current.address, mac_dinh: !current.address.mac_dinh } })}
                  >
                    <MaterialIcons name={editor.address.mac_dinh ? 'check-box' : 'check-box-outline-blank'} color={shop.primary} size={22} />
                    <Text style={styles.label}>Đặt làm địa chỉ mặc định</Text>
                  </Pressable>
                )}
                <View style={styles.actions}>
                  <Pressable style={styles.primaryButton} accessibilityLabel="Lưu địa chỉ" disabled={busy} onPress={save}>
                    <Text style={styles.primaryText}>{busy ? 'Đang lưu...' : 'Lưu địa chỉ'}</Text>
                  </Pressable>
                  <Pressable style={styles.action} disabled={busy} onPress={() => { setEditor(null); setError(''); }}>
                    <Text style={styles.link}>Hủy</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.primaryButton} accessibilityLabel="Thêm địa chỉ" onPress={() => openEditor()}>
                <MaterialIcons name="add-location-alt" size={22} color="#fff" />
                <Text style={styles.primaryText}>Thêm địa chỉ</Text>
              </Pressable>
            )}
            {!addresses.length && !editor ? <EmptyState icon="location-on" title="Chưa có địa chỉ giao hàng" /> : null}
            {addresses.map(address => (
              <View key={address.ma_dia_chi} style={[styles.card, Boolean(address.mac_dinh) && styles.defaultCard]}>
                <View style={styles.addressHeader}>
                  <MaterialIcons name="location-on" size={22} color={shop.primary} />
                  <Text style={[styles.title, styles.recipient]}>{address.ho_ten}</Text>
                  {address.mac_dinh ? <Text style={styles.badge}>Mặc định</Text> : null}
                </View>
                <Text style={styles.muted}>{address.so_dien_thoai}</Text>
                <Text style={styles.address}>{address.dia_chi}</Text>
                {deleteId === address.ma_dia_chi ? (
                  <View style={styles.confirmDelete}>
                    <Text style={styles.address}>Xóa địa chỉ này khỏi sổ địa chỉ?</Text>
                    <View style={styles.actions}>
                      <Pressable style={styles.action} disabled={busy} onPress={() => void mutate(() => addressService.remove(address.ma_dia_chi), 'Đã xóa địa chỉ.')}>
                        <Text style={styles.danger}>Xác nhận xóa</Text>
                      </Pressable>
                      <Pressable style={styles.action} disabled={busy} onPress={() => setDeleteId(undefined)}><Text style={styles.link}>Hủy</Text></Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable style={styles.action} accessibilityLabel={`Sửa địa chỉ của ${address.ho_ten}`} disabled={busy || Boolean(editor)} onPress={() => openEditor(address)}>
                      <Text style={styles.link}>Sửa</Text>
                    </Pressable>
                    {!address.mac_dinh ? (
                      <Pressable style={styles.action} accessibilityLabel={`Đặt địa chỉ của ${address.ho_ten} làm mặc định`} disabled={busy || Boolean(editor)} onPress={() => void mutate(() => addressService.setDefault(address.ma_dia_chi), 'Đã đổi địa chỉ mặc định.')}>
                        <Text style={styles.link}>Đặt mặc định</Text>
                      </Pressable>
                    ) : null}
                    <Pressable style={styles.action} accessibilityLabel={`Xóa địa chỉ của ${address.ho_ten}`} disabled={busy || Boolean(editor)} onPress={() => { setError(''); setNotice(''); setDeleteId(address.ma_dia_chi); }}>
                      <Text style={styles.danger}>Xóa</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.background },
  content: { padding: layout.gutter, paddingBottom: space.xxl, gap: space.sm, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  card: { padding: space.md, gap: space.xs, backgroundColor: shop.surface, borderRadius: radius.md, borderWidth: 1, borderColor: shop.border },
  defaultCard: { borderColor: shop.primary },
  title: { color: shop.ink, fontSize: 16, fontWeight: '700' },
  recipient: { flexShrink: 1 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.xs },
  badge: { backgroundColor: shop.soft, color: shop.primary, borderRadius: radius.pill, paddingVertical: space.xxs, paddingHorizontal: space.xs, fontSize: 12, fontWeight: '700' },
  address: { color: shop.ink, lineHeight: 21 },
  muted: { color: shop.muted, fontSize: 13, lineHeight: 20 },
  field: { gap: space.xxs, marginTop: space.xxs },
  label: { color: shop.ink, fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: shop.surfaceMuted, borderWidth: 1, borderColor: shop.border, paddingHorizontal: space.sm },
  multiline: { minHeight: 78, textAlignVertical: 'top', paddingTop: space.sm },
  check: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  primaryButton: { minHeight: layout.touch, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space.xs, padding: space.sm, backgroundColor: shop.action, borderRadius: radius.sm },
  primaryText: { color: '#fff', fontWeight: '700' },
  link: { color: shop.primary, fontWeight: '700' },
  danger: { color: shop.danger, fontWeight: '700' },
  error: { color: shop.danger, backgroundColor: shop.dangerSoft, padding: space.sm, borderRadius: radius.sm },
  notice: { color: shop.success, backgroundColor: shop.successSoft, padding: space.sm, borderRadius: radius.sm },
  confirmDelete: { padding: space.xs, backgroundColor: shop.dangerSoft, borderRadius: radius.sm },
});
