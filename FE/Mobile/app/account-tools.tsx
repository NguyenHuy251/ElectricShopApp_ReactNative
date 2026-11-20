import { EmptyState } from '@/components/shop-ui';
import { SectionIntro, Pressable, Text, TextInput } from '@/components/ui';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, radius, space, type ShopPalette } from '@/constants/shop-theme';
import { authService } from '@/services/auth.service';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/services/api';
import { getApiMessage } from '@/utils/format';

export default function AccountToolsScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (section === 'notifications') return <Redirect href="/notifications" />;
  if (section === 'addresses') return <Redirect href="/addresses" />;
  return <ChangePassword />;
}

function ChangePassword() {
  const { styles } = useShopStyles(makeStyles);
  const router = useRouter();
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const submit = async () => {
    if (lock.current) return;
    if (newPassword !== confirm) { setError('Mật khẩu nhập lại không khớp.'); return; }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await api.put('/auth/password', { mat_khau_cu: oldPassword, mat_khau_moi: newPassword });
      setOldPassword('');
      setNewPassword('');
      setConfirm('');
      await authService.logout();
      router.replace('/(auth)/login');
    } catch (err) {
      setError(getApiMessage(err, 'Chưa thể lưu thay đổi.'));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <SectionIntro title="Đổi mật khẩu" description="Quản lý thông tin và bảo vệ tài khoản mua sắm của bạn." />
          {error ? <EmptyState icon="error-outline" title="Chưa hoàn tất yêu cầu" message={error} action="Tải lại" onAction={() => setError('')} /> : null}
          <View style={styles.card}>
            <TextInput accessibilityLabel="Mật khẩu hiện tại" placeholder="Mật khẩu hiện tại" secureTextEntry value={oldPassword} onChangeText={setOldPassword} style={styles.input} />
            <TextInput accessibilityLabel="Mật khẩu mới" placeholder="Mật khẩu mới (8–72 ký tự)" secureTextEntry value={newPassword} onChangeText={setNewPassword} style={styles.input} />
            <TextInput accessibilityLabel="Nhập lại mật khẩu" placeholder="Nhập lại mật khẩu" secureTextEntry value={confirm} onChangeText={setConfirm} style={styles.input} />
            <Pressable disabled={busy} style={styles.button} onPress={() => void submit()}><Text style={styles.buttonText}>Đổi mật khẩu</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.background },
  content: { padding: layout.gutter, gap: space.md, maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' },
  card: { padding: layout.gutter, borderRadius: radius.md, backgroundColor: shop.surface, gap: space.md },
  input: { padding: space.sm, borderWidth: 1, borderColor: shop.border, borderRadius: 12, color: shop.ink },
  button: { padding: space.sm, backgroundColor: shop.action, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
