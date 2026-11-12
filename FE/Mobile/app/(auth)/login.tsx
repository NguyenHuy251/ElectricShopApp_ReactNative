import { Pressable, Text } from '@/components/ui';
import { shop, radius, space } from '@/constants/shop-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AuthField, AuthShell } from '@/components/auth-ui';
import { authService } from '../../services/auth.service';
import { getApiMessage } from '../../utils/format';

export default function LoginScreen() {
  const router = useRouter();
  const { registered, username } = useLocalSearchParams<{ registered?: string; username?: string }>();
  const [ten_dang_nhap, setTenDangNhap] = useState(username || '');
  const [mat_khau, setMatKhau] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const handleLogin = async () => {
    if (busy.current) return;
    if (!ten_dang_nhap.trim() || !mat_khau) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    busy.current = true;
    setError('');
    setLoading(true);
    try {
      await authService.login(ten_dang_nhap.trim(), mat_khau);
      router.replace('/(tabs)');
    } catch (error: any) {
      const retryAfter = Number(error?.response?.headers?.['retry-after']);
      setError(getApiMessage(error, 'Đăng nhập thất bại') + (error?.response?.status === 429 && retryAfter > 0 ? ` Thử lại sau khoảng ${Math.ceil(retryAfter / 60)} phút.` : ''));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthShell>
        <Text style={styles.title}>Chào bạn trở lại!</Text>
        <Text style={styles.subtitle}>Đăng nhập để tiếp tục chọn đồ cho tổ ấm.</Text>
        {registered === '1' ? <Text accessibilityRole="alert" style={styles.success}>Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.</Text> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <AuthField placeholder="Tên đăng nhập" value={ten_dang_nhap} onChangeText={value => { setTenDangNhap(value); setError(''); }} autoCapitalize="none" autoCorrect={false} editable={!loading} />
        <Text style={styles.hint}>Dùng tên đăng nhập bạn đã tạo khi đăng ký.</Text>
        <AuthField placeholder="Mật khẩu" secureTextEntry value={mat_khau} onChangeText={value => { setMatKhau(value); setError(''); }} editable={!loading} />
        <Pressable accessibilityRole="button" style={[styles.button, loading && styles.disabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => router.push('/(auth)/forgot-password')}><Text style={styles.linkText}>Quên mật khẩu?</Text></Pressable>
        <Text style={styles.linkText} onPress={() => router.push('/(auth)/register' as any)}>Chưa có tài khoản? Đăng ký</Text>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  success: { color: shop.primary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  error: { color: '#A52D2D', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  hint: { color: shop.muted, fontSize: 12, marginBottom: 12 },
  title: { color: shop.ink, fontSize: 30, fontWeight: '700' },
  subtitle: { color: shop.muted, marginTop: 6, marginBottom: space.lg },
  button: { height: 54, borderRadius: radius.md, backgroundColor: shop.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  linkText: { paddingVertical: 16, marginTop: 6, textAlign: 'center', color: shop.primary, fontWeight: '700' },
});
