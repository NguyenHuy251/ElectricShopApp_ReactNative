import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable as NativePressable, Text as NativeText, TextInput as NativeInput, StyleSheet, View } from 'react-native';
import type { PressableProps, TextProps, TextInputProps } from 'react-native';
import { fontFamily, layout, radius, shop, space, typography } from '@/constants/shop-theme';

/** Native primitives with a shared baseline; callers retain their handlers and styles. */
export const Text = forwardRef<ComponentRef<typeof NativeText>, TextProps>(function Text({ style, ...props }, ref) {
  return <NativeText ref={ref} {...props} style={[{ fontFamily, color: shop.ink }, style]} />;
});
export const Pressable = forwardRef<ComponentRef<typeof View>, PressableProps>(function Pressable({ style, disabled, accessibilityState, hitSlop = 6, ...props }, ref) {
  return <NativePressable ref={ref} accessibilityRole="button" {...props} disabled={disabled} hitSlop={hitSlop} accessibilityState={{ ...accessibilityState, disabled: !!disabled || accessibilityState?.disabled }} style={state => [typeof style === 'function' ? style(state) : style, disabled ? { opacity: 0.48 } : state.pressed ? { opacity: 0.7 } : null]} />;
});
export const TextInput = forwardRef<ComponentRef<typeof NativeInput>, TextInputProps>(function TextInput({ style, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const borderColor = StyleSheet.flatten(style)?.borderColor;
  return <NativeInput ref={ref} placeholderTextColor={shop.muted} selectionColor={shop.primary} {...props} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} style={[styles.input, style, focused && { backgroundColor: shop.surface, borderColor: borderColor === shop.danger ? shop.danger : shop.primary }]} />;
});

export function OrderProgress({ status }: { status: string }) {
  if (status === 'DaHuy') return <View style={styles.cancelled}><Text style={{ ...typography.label, color: shop.danger }}>Đơn hàng đã hủy</Text></View>;
  const active = ['ChoXacNhan', 'DaXacNhan', 'DangGiao', 'DaGiao'].indexOf(status);
  if (active < 0) return null;
  return <View accessibilityLabel={`Tiến trình đơn hàng: ${['Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Đã giao'][active]}`} style={styles.progress}>
    {['Đặt hàng', 'Xác nhận', 'Đang giao', 'Hoàn tất'].map((label, index) => <View key={label} style={styles.step}><View style={[styles.track, index <= active && { backgroundColor: shop.primary }]} /><Text style={[styles.stepLabel, index === active && { color: shop.primary, fontWeight: '700' }]}>{label}</Text></View>)}
  </View>;
}

export function SectionIntro({ title, description }: { title: string; description: string }) {
  return <View style={{ gap: space.xs, paddingVertical: space.sm }}><Text accessibilityRole="header" style={typography.title}>{title}</Text><Text style={{ ...typography.body, color: shop.muted }}>{description}</Text></View>;
}

const styles = StyleSheet.create({
  input: { fontFamily, minHeight: layout.touch, color: shop.ink, fontSize: typography.body.fontSize, borderRadius: radius.sm },
  progress: { flexDirection: 'row', gap: space.xxs, marginVertical: space.md },
  step: { flex: 1, gap: space.xs }, track: { height: 3, borderRadius: 2, backgroundColor: shop.border },
  stepLabel: { ...typography.caption, color: shop.muted }, cancelled: { paddingVertical: space.sm },
});
