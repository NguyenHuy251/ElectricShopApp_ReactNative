import { Pressable, Text, TextInput } from '@/components/ui';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { GestureResponderHandlers } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatbotService, type ChatMessage, type ChatProduct } from '@/services/chatbot.service';
import { shop, radius, space } from '@/constants/shop-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatCurrency, getApiMessage } from '@/utils/format';

type Message = ChatMessage & { id: number; products?: ChatProduct[] };
const welcome: Message = { id: 0, role: 'assistant', text: 'Chào bạn! Mình là trợ lý AI ElectricShop. Mình có thể giúp bạn tìm sản phẩm và hướng dẫn mua sắm trong app. Bạn đang cần thiết bị gì?' };
const SIZE = 58;

export function CustomerChatbot() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const lock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const scroll = useRef<ScrollView>(null);
  const initialPosition = { x: Math.max(12, width - SIZE - 18), y: Math.max(insets.top, height - insets.bottom - SIZE - Math.min(280, height * 0.4)) };
  const position = useRef(initialPosition);
  const bounds = useRef({ width, height, top: insets.top, bottom: insets.bottom });
  const [offset] = useState(() => new Animated.ValueXY(initialPosition));
  const start = useRef(initialPosition);
  const clamp = useCallback((x: number, y: number) => ({ x: Math.max(8, Math.min(x, bounds.current.width - SIZE - 8)), y: Math.max(bounds.current.top + 8, Math.min(y, bounds.current.height - bounds.current.bottom - SIZE - 12)) }), []);
  useEffect(() => {
    bounds.current = { width, height, top: insets.top, bottom: insets.bottom };
    position.current = clamp(position.current.x, position.current.y);
    offset.setValue(position.current);
  }, [width, height, insets.top, insets.bottom, offset, clamp]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); }; }, []);
  const [panHandlers, setPanHandlers] = useState<GestureResponderHandlers>({});
  useEffect(() => { const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = position.current; },
    onPanResponderMove: (_, gesture) => { position.current = clamp(start.current.x + gesture.dx, start.current.y + gesture.dy); offset.setValue(position.current); },
    onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6) setOpen(true); },
    onPanResponderTerminationRequest: () => false,
  }); setPanHandlers(pan.panHandlers); }, [offset, clamp]);

  const send = async (suggestion?: string) => {
    const question = (suggestion ?? text).trim();
    if (!question || lock.current) return;
    lock.current = true;
    const history = messages.filter(item => item.id !== 0).map(({ role, text }) => ({ role, text })).slice(-8);
    const mine: Message = { id: ++sequence.current, role: 'user', text: question };
    setMessages(current => [...current.slice(-39), mine]); setText(''); setError(''); setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await chatbotService.ask(question, history, controller.signal);
      if (mounted.current && !controller.signal.aborted) setMessages(current => [...current.slice(-39), { id: ++sequence.current, role: 'assistant', text: response.reply, products: response.products }]);
    } catch (err) {
      if (mounted.current && !controller.signal.aborted) {
        setError(getApiMessage(err, 'Chưa kết nối được trợ lý. Bạn thử lại hoặc chọn Liên hệ nhân viên.'));
        setText(question);
        setMessages(current => current.filter(item => item.id !== mine.id));
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const contact = () => { setOpen(false); router.push('/contact'); };

  return <>
    <Animated.View {...panHandlers} accessible accessibilityRole="button" accessibilityLabel="Mở trợ lý ElectricShop. Kéo để di chuyển" onAccessibilityTap={() => setOpen(true)} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') setOpen(true); }} style={[styles.bubble, { transform: offset.getTranslateTransform() }]}>
      <MaterialIcons name="support-agent" size={29} color="#fff" /><View style={styles.online} />
    </Animated.View>
    <Modal visible={open} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Đóng trò chuyện" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={[styles.panel, { width: Math.min(width - 24, 460), height: Math.min(height - insets.top - insets.bottom - 32, 610), marginBottom: insets.bottom + 16 }]}>
          <View style={styles.header}><View style={styles.logo}><MaterialIcons name="support-agent" size={25} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.title}>Trợ lý ElectricShop</Text><Text style={styles.caption}>AI hỗ trợ mua sắm</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng khung chat" hitSlop={8} onPress={() => setOpen(false)} style={styles.iconButton}><MaterialIcons name="close" size={23} color="#fff" /></Pressable></View>
          <Text style={styles.disclaimer}>Chỉ hỗ trợ sản phẩm và sử dụng app. Vui lòng không gửi mật khẩu, OTP hay thông tin nhạy cảm.</Text>
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={styles.thread} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !reducedMotion })}>
            {messages.map(message => <View key={message.id} style={[styles.message, message.role === 'user' ? styles.mine : styles.theirs]}><Text selectable style={[styles.messageText, message.role === 'user' && { color: '#fff' }]}>{message.text}</Text>{message.products?.map(product => <Pressable accessibilityRole="button" key={product.ma_san_pham} style={styles.product} onPress={() => { setOpen(false); router.push({ pathname: '/product/[id]', params: { id: String(product.ma_san_pham) } }); }}><Text style={styles.productTitle}>{product.ten_san_pham}</Text><Text style={styles.productPrice}>{formatCurrency(product.gia_ban)}  →</Text></Pressable>)}</View>)}
            {messages.length === 1 && <View style={styles.suggestions}>{['Tư vấn chọn sản phẩm', 'Mua hàng trong app thế nào?'].map(suggestion => <Pressable key={suggestion} style={styles.chip} onPress={() => void send(suggestion)} disabled={busy}><Text style={styles.chipText}>{suggestion}</Text></Pressable>)}</View>}
            {busy && <View accessibilityLiveRegion="polite" style={styles.typing}><ActivityIndicator color={shop.primary} size="small" /><Text style={styles.muted}>Trợ lý đang tìm thông tin…</Text></View>}
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.composer}><TextInput accessibilityLabel="Nhập câu hỏi cho trợ lý" placeholder="Bạn cần hỗ trợ gì?" placeholderTextColor={shop.muted} value={text} onChangeText={setText} maxLength={1500} multiline style={styles.input} editable={!busy} /><Pressable accessibilityRole="button" accessibilityLabel="Gửi câu hỏi" disabled={busy || !text.trim()} onPress={() => void send()} style={[styles.send, (busy || !text.trim()) && { opacity: 0.45 }]}><MaterialIcons name="send" size={21} color="#fff" /></Pressable></View>
          <View style={styles.footer}><Pressable onPress={contact} accessibilityRole="button"><Text style={styles.link}>Liên hệ nhân viên</Text></Pressable><Pressable disabled={busy} onPress={() => { setMessages([welcome]); setError(''); setText(''); }} accessibilityRole="button"><Text style={[styles.muted, busy && { opacity: 0.5 }]}>Chat mới</Text></Pressable></View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', left: 0, top: 0, width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: shop.primary, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 9, shadowColor: shop.ink, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  online: { position: 'absolute', bottom: 3, right: 3, width: 12, height: 12, backgroundColor: shop.accent, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  overlay: { flex: 1, backgroundColor: '#10263B66', alignItems: 'flex-end', justifyContent: 'flex-end', paddingHorizontal: 12 },
  panel: { backgroundColor: shop.background, borderRadius: radius.lg, overflow: 'hidden', alignSelf: 'flex-end', maxHeight: '94%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, backgroundColor: shop.ink },
  logo: { backgroundColor: '#FFFFFF15', width: 40, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' }, caption: { color: '#BCD6E1', fontSize: 12, marginTop: 4 },
  iconButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: shop.muted, fontSize: 12, lineHeight: 16, padding: 12, backgroundColor: shop.soft },
  thread: { padding: 14, gap: space.sm }, message: { maxWidth: '92%', borderRadius: radius.md, padding: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: shop.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: shop.border, borderBottomLeftRadius: 4 },
  messageText: { color: shop.ink, fontSize: 15, lineHeight: 23 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: space.xs }, muted: { color: shop.muted, fontSize: 12 },
  error: { color: shop.danger, fontSize: 12, lineHeight: 19, padding: 10 },
  suggestions: { gap: space.xs, alignItems: 'flex-start' }, chip: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: shop.border, backgroundColor: '#fff' }, chipText: { color: shop.primary, fontSize: 12 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, padding: 12, borderTopWidth: 1, borderColor: shop.border, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 44, maxHeight: 100, padding: 10, color: shop.ink, backgroundColor: shop.background, borderRadius: 12, fontSize: 14 },
  send: { height: 44, width: 44, borderRadius: 13, backgroundColor: shop.primary, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#fff' }, link: { color: shop.primary, fontSize: 12, fontWeight: '700' },
  product: { padding: 10, marginTop: 10, backgroundColor: shop.soft, borderRadius: radius.sm }, productTitle: { color: shop.ink, fontSize: 12, fontWeight: '700' }, productPrice: { color: shop.primary, marginTop: 5, fontSize: 12 },
});
