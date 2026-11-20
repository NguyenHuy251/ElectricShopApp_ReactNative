import { Pressable, Text, TextInput } from '@/components/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShopStyles } from '@/components/shop-appearance';
import { layout, space, type ShopPalette } from '@/constants/shop-theme';

export function AuthShell({ children, register = false }: PropsWithChildren<{ register?: boolean }>) {
  const { shop, styles } = useShopStyles(makeStyles);
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}><View style={styles.brandIcon}><MaterialIcons name="bolt" size={25} color={shop.inverseAccent} /></View><Text style={styles.brandText}>ElectricShop</Text></View>
        <View style={[styles.hero, register && styles.compactHero]}>
          <Text style={styles.heroEyebrow}>THIẾT BỊ CHO NHÀ · THỜI GIAN CHO BẠN</Text>
          <Text style={styles.heroTitle}>{register ? 'Tổ ấm mới. Trải nghiệm mới.' : 'Tiện nghi cho nhà.\nThảnh thơi cho bạn.'}</Text>
        </View>
        <View style={styles.form}>{children}</View>
        <Text style={styles.footer}>Electric Shop · Đồng hành cùng tổ ấm</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function AuthField({ placeholder, secureTextEntry, ...props }: TextInputProps) {
  const { shop, styles } = useShopStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{placeholder}</Text>
    <View style={[styles.inputRow, focused && styles.focused]}>
      <TextInput {...props} placeholder={placeholder} accessibilityLabel={placeholder} placeholderTextColor={shop.muted} secureTextEntry={secureTextEntry && !visible} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={styles.input} />
      {secureTextEntry ? <Pressable accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(!visible)} style={styles.eye}><MaterialIcons name={visible ? 'visibility-off' : 'visibility'} size={20} color={shop.muted} /></Pressable> : null}
    </View>
  </View>;
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.surface }, flex: { flex: 1 },
  content: { flexGrow: 1, padding: 22, width: '100%', maxWidth: 540, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginBottom: space.lg },
  brandIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: shop.inverseSurface, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: shop.ink, fontSize: 23, fontWeight: '700', letterSpacing: -0.8 },
  brandNote: { color: shop.muted, fontSize: 11, letterSpacing: 0.8, marginLeft: 'auto' },
  hero: { backgroundColor: shop.surface, paddingVertical: 16, minHeight: 135, marginBottom: 16, borderBottomWidth: 1, borderColor: shop.border },
  compactHero: { minHeight: 96 },
  circle: { width: 200, height: 200, borderRadius: 100, backgroundColor: shop.border, position: 'absolute', right: -65, bottom: -60 },
  illustration: { position: 'absolute', right: -10, bottom: 10, opacity: 0.35, transform: [{ rotate: '-12deg' }] },
  heroEyebrow: { color: shop.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  heroTitle: { color: shop.ink, fontWeight: '700', fontSize: 30, lineHeight: 39, letterSpacing: -0.8, marginTop: 16 },
  heroNote: { color: '#CAD8E4', fontSize: 12, marginTop: 14 },
  form: { paddingVertical: 16, backgroundColor: shop.surface },
  footer: { color: shop.muted, fontSize: 12, textAlign: 'center', paddingVertical: 26 },
  field: { marginBottom: 16 },
  label: { color: shop.ink, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  inputRow: { flexDirection: 'row', backgroundColor: shop.surfaceMuted, borderRadius: 12, borderWidth: 1, borderColor: shop.border, alignItems: 'center' },
  focused: { borderColor: shop.primary, backgroundColor: shop.surface },
  input: { flex: 1, minHeight: 52, paddingHorizontal: 15, color: shop.ink, fontSize: 14 },
  eye: { minWidth: 48, minHeight: layout.touch, alignItems: 'center', justifyContent: 'center' },
});
