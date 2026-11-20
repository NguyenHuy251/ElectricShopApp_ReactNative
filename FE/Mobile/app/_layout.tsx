import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ShopAppearanceProvider, useShopAppearance } from '@/components/shop-appearance';
import { authService } from '@/services/auth.service';
import { isStoredMobileStaff } from '@/utils/mobile-access';
import { CustomerChatbot } from '@/components/customer-chatbot';
import { InboxUnreadNotice } from '@/components/inbox-unread-notice';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { NotificationProvider } from '@/components/notification-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return <ShopAppearanceProvider><ShopNavigation /></ShopAppearanceProvider>;
}

function ShopNavigation() {
  const { scheme, shop } = useShopAppearance();
  const navigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const segments = useSegments();
  const routeGroup = segments[0];

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem('token'),
      AsyncStorage.getItem('user'),
    ]).then(async ([token, user]) => {
      if (!active) return;
      if (token && isStoredMobileStaff(user)) {
        await authService.logout();
        if (active) router.replace('/(auth)/login');
        return;
      }
      const inAuthGroup = routeGroup === '(auth)';
      if (!token && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (token && inAuthGroup) {
        router.replace('/(tabs)');
      }
    });

    return () => {
      active = false;
    };
  }, [routeGroup, router]);

  return (
    <NotificationProvider
      key={routeGroup === '(auth)' ? 'guest' : 'customer'}
      enabled={Boolean(routeGroup && routeGroup !== '(auth)')}
    >
      <ThemeProvider
        value={{
          ...navigationTheme,
          colors: {
            ...navigationTheme.colors,
            primary: shop.primary,
            background: shop.background,
            card: shop.background,
            text: shop.ink,
            border: shop.border,
          },
        }}
      >
        <Stack
          screenOptions={{
            animation: reducedMotion ? 'none' : 'default',
            headerShadowVisible: false,
            headerTintColor: shop.ink,
            headerStyle: { backgroundColor: shop.surface },
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
            contentStyle: { backgroundColor: shop.background },
            headerBackTitle: 'Quay lại',
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="product/[id]"
            options={{ title: 'Chi tiết sản phẩm' }}
          />
          <Stack.Screen
            name="order/[id]"
            options={{ title: 'Chi tiết đơn hàng' }}
          />
          <Stack.Screen name="checkout" options={{ title: 'Thanh toán' }} />
          <Stack.Screen
            name="checkout-success"
            options={{ title: 'Đơn hàng của bạn', headerBackVisible: false }}
          />
          <Stack.Screen
            name="account-tools"
            options={{ title: 'Đổi mật khẩu' }}
          />
          <Stack.Screen
            name="vouchers"
            options={{ title: 'Voucher của tôi', headerBackTitle: 'Quay lại' }}
          />
          <Stack.Screen name="orders" options={{ title: 'Đơn hàng của tôi' }} />
          <Stack.Screen
            name="contact"
            options={{ title: 'Hộp thư cửa hàng' }}
          />
          <Stack.Screen name="notifications" options={{ title: 'Thông báo' }} />
          <Stack.Screen
            name="rewards"
            options={{ title: 'Điểm danh & Quà tặng' }}
          />
          <Stack.Screen
            name="referral"
            options={{ title: 'Mời bạn bè nhận 50K' }}
          />
        </Stack>
        {routeGroup !== '(auth)' &&
        !segments.some((segment) =>
          ['contact', 'notifications'].includes(String(segment)),
        ) ? (
          <>
            <CustomerChatbot />
            {routeGroup !== '(tabs)' && <InboxUnreadNotice />}
          </>
        ) : null}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </NotificationProvider>
  );
}
