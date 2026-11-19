import { useCallback, useRef, useState, type ComponentRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, TextInput } from './ui';
import api from '@/services/api';
import { shop } from '@/constants/shop-theme';
import { getApiMessage } from '@/utils/format';

type Message = {
  ma_tin_nhan: string;
  ben_gui: 'KhachHang' | 'CuaHang';
  noi_dung: string;
  ngay_gui: string;
  ngay_doc: string | null;
};
export default function StoreInbox() {
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(''),
    [error, setError] = useState('');
  const [loading, setLoading] = useState(true),
    [sending, setSending] = useState(false),
    [more, setMore] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null),
    bottom = useRef(true),
    active = useRef(false),
    fetching = useRef(false),
    lock = useRef(false);
  const pending = useRef<{ body: string; id: string } | null>(null);
  const firstLoad = useRef(true);
  const latest = useRef<string | undefined>(undefined);
  const marked = useRef('0');
  const load = useCallback(async (before?: string) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const r = await api.get('/inbox/mine', {
        params: before
          ? { before }
          : latest.current
            ? { after: latest.current }
            : undefined,
      });
      if (!active.current) return;
      const incoming: Message[] = r.data.data.messages;
      setMessages((current) =>
        [
          ...new Map(
            [...current, ...incoming].map((m) => [m.ma_tin_nhan, m]),
          ).values(),
        ]
          .map((m) =>
            m.ben_gui === 'KhachHang' &&
            Number(m.ma_tin_nhan) <= Number(r.data.data.seenThrough || 0)
              ? { ...m, ngay_doc: r.data.data.seenAt }
              : m,
          )
          .sort((a, b) => Number(a.ma_tin_nhan) - Number(b.ma_tin_nhan)),
      );
      if (before || firstLoad.current) setMore(r.data.data.hasMore);
      firstLoad.current = false;
      setError('');
      const last = incoming.at(-1);
      if (last && Number(last.ma_tin_nhan) > Number(latest.current || 0))
        latest.current = last.ma_tin_nhan;
      if (
        AppState.currentState === 'active' &&
        latest.current &&
        bottom.current &&
        Number(latest.current) > Number(marked.current)
      ) {
        const upTo = latest.current;
        await api.post('/inbox/mine/read', { up_to: upTo });
        marked.current = upTo;
      }
    } catch (e) {
      if (active.current)
        setError(getApiMessage(e, 'Chưa tải được tin nhắn. Hãy thử lại.'));
    } finally {
      fetching.current = false;
      if (active.current) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void load();
      const timer = setInterval(() => {
        if (AppState.currentState === 'active') void load();
      }, 5000);
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
  const send = async () => {
    const body = text.trim();
    if (!body || lock.current) return;
    lock.current = true;
    setSending(true);
    setError('');
    if (pending.current?.body !== body)
      pending.current = {
        body,
        id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      };
    try {
      await api.post('/inbox/mine', {
        noi_dung: body,
        request_id: pending.current.id,
      });
      if (active.current) {
        setText('');
        pending.current = null;
        bottom.current = true;
        await load();
      }
    } catch (e) {
      if (active.current)
        setError(
          getApiMessage(e, 'Chưa gửi được. Nội dung được giữ lại để thử lại.'),
        );
    } finally {
      lock.current = false;
      if (active.current) setSending(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : Platform.OS === 'android'
            ? 'height'
            : undefined
      }
      // Keyboard coordinates include the native Stack header; this view starts below it.
      keyboardVerticalOffset={Platform.OS === 'web' ? 0 : headerHeight}
    >
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <MaterialIcons name="storefront" size={25} color={shop.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>ElectricShop</Text>
            <Text style={styles.caption}>
              Nhắn trực tiếp với nhân viên cửa hàng
            </Text>
          </View>
        </View>
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
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios'
              ? 'interactive'
              : Platform.OS === 'android'
                ? 'on-drag'
                : 'none'
          }
          onLayout={() => {
            if (bottom.current)
              scroll.current?.scrollToEnd({ animated: false });
          }}
          onScroll={(e) => {
            const s = e.nativeEvent;
            bottom.current =
              s.contentSize.height -
                s.layoutMeasurement.height -
                s.contentOffset.y <
              80;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (bottom.current)
              scroll.current?.scrollToEnd({ animated: false });
          }}
        >
          {more && messages.length ? (
            <Pressable
              disabled={loading}
              onPress={() => {
                bottom.current = false;
                void load(messages[0].ma_tin_nhan);
              }}
            >
              <Text style={styles.older}>Tải tin nhắn trước</Text>
            </Pressable>
          ) : null}
          {loading ? (
            <Text style={styles.older}>Đang tải cuộc trò chuyện...</Text>
          ) : !messages.length ? (
            <View style={styles.empty}>
              <MaterialIcons name="forum" size={40} color={shop.primary} />
              <Text style={styles.title}>Cửa hàng có thể giúp gì cho bạn?</Text>
              <Text style={styles.caption}>
                Gửi câu hỏi về sản phẩm, đơn hàng hoặc bảo hành tại đây.
              </Text>
            </View>
          ) : null}
          {messages.map((m) => (
            <View
              key={m.ma_tin_nhan}
              style={[
                styles.message,
                m.ben_gui === 'KhachHang' ? styles.mine : styles.theirs,
              ]}
            >
              <Text
                selectable
                style={[
                  styles.body,
                  m.ben_gui === 'KhachHang' && { color: '#fff' },
                ]}
              >
                {m.noi_dung}
              </Text>
              <Text
                style={[
                  styles.time,
                  m.ben_gui === 'KhachHang' && { color: '#d5e9e1' },
                ]}
              >
                {new Date(m.ngay_gui).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                })}
                {m.ben_gui === 'KhachHang'
                  ? m.ngay_doc
                    ? ' · Đã xem'
                    : ' · Đã gửi'
                  : ''}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Tin nhắn cho cửa hàng"
            value={text}
            onChangeText={setText}
            onFocus={() => {
              bottom.current = true;
              scroll.current?.scrollToEnd({ animated: false });
            }}
            editable={!sending}
            placeholder="Nhập tin nhắn..."
            multiline
            maxLength={5000}
            style={styles.input}
          />
          <Pressable
            accessibilityLabel="Gửi tin nhắn"
            disabled={sending || !text.trim()}
            style={styles.send}
            onPress={() => void send()}
          >
            <MaterialIcons
              name={sending ? 'hourglass-empty' : 'send'}
              size={23}
              color="#fff"
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: shop.background },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 16,
    backgroundColor: shop.surface,
    borderBottomWidth: 1,
    borderColor: shop.border,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: shop.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700' },
  caption: { fontSize: 13, color: shop.muted, lineHeight: 20 },
  thread: {
    padding: 16,
    gap: 12,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flexGrow: 1,
  },
  message: { maxWidth: '88%', padding: 14, borderRadius: 18, gap: 7 },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: shop.primary,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.border,
    borderBottomLeftRadius: 4,
  },
  body: { fontSize: 15, lineHeight: 23 },
  time: { fontSize: 11, color: shop.muted },
  composer: {
    flexShrink: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: shop.surface,
    borderTopWidth: 1,
    borderColor: shop.border,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    padding: 12,
    backgroundColor: shop.background,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: shop.primary,
  },
  error: {
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff0ee',
  },
  link: { color: shop.primary, fontWeight: '600' },
  older: { textAlign: 'center', padding: 12, color: shop.primary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
});
