import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useLinkBuilder } from 'expo-router/react-navigation';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useState, type ComponentProps } from 'react';
import { Animated, Easing, I18nManager, Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Text } from '@/components/ui';
import { useShopStyles, useShopAppearance } from '@/components/shop-appearance';
import { type ShopPalette } from '@/constants/shop-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TabArtwork = { ios: [SFSymbol, SFSymbol]; fallback: [IconName, IconName] };

const artwork: Record<string, TabArtwork> = {
  index: { ios: ['house', 'house.fill'], fallback: ['home-outline', 'home'] },
  products: { ios: ['square.grid.2x2', 'square.grid.2x2.fill'], fallback: ['view-grid-outline', 'view-grid'] },
  cart: { ios: ['cart', 'cart.fill'], fallback: ['cart-outline', 'cart'] },
  profile: { ios: ['person.crop.circle', 'person.crop.circle.fill'], fallback: ['account-circle-outline', 'account-circle'] },
};

function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { shop, styles } = useShopStyles(makeStyles);
  const { buildHref } = useLinkBuilder();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const [selection] = useState(() => new Animated.Value(state.index));

  useEffect(() => {
    if (reducedMotion) {
      selection.setValue(state.index);
      return;
    }

    const slide = Animated.timing(selection, {
      toValue: state.index,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    slide.start();
    return () => slide.stop();
  }, [reducedMotion, selection, state.index]);

  const tabWidth = width / state.routes.length;
  const translateX = selection.interpolate({
    inputRange: [0, 1],
    outputRange: [0, I18nManager.isRTL ? -tabWidth : tabWidth],
  });

  return (
    <View style={[styles.frame, {
      paddingLeft: Math.max(14, insets.left),
      paddingRight: Math.max(14, insets.right),
      paddingBottom: Math.max(10, insets.bottom),
    }]}>
      <View style={styles.dock}>
        <View role="tablist" style={styles.row} onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}>
          {tabWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[styles.selection, { width: tabWidth - 4, transform: [{ translateX }] }]}
            />
          )}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label = options.title ?? route.name;
            const color = focused ? shop.primary : shop.muted;
            const icons = artwork[route.name] ?? artwork.index;
            const variant = focused ? 1 : 0;

            return (
              <HapticTab
                key={route.key}
                href={buildHref(route.name, route.params)}
                role={Platform.OS === 'ios' ? 'button' : 'tab'}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                aria-selected={focused}
                accessibilityShowsLargeContentViewer
                accessibilityLargeContentTitle={label}
                onPress={() => {
                  const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigateToTab(route.key);
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                pressOpacity={0.65}
                pressColor="rgba(18, 107, 96, 0.10)"
                style={styles.tab}
              >
                <View aria-hidden accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  {Platform.OS === 'ios' ? (
                    <SymbolView name={icons.ios[variant]} size={23} style={styles.icon} weight="medium" tintColor={color} />
                  ) : (
                    <MaterialCommunityIcons name={icons.fallback[variant]} size={24} color={color} />
                  )}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.label, { color }, focused && styles.selectedLabel]}>
                  {label}
                </Text>
              </HapticTab>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { shop } = useShopAppearance();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: shop.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="products" options={{ title: 'Sản phẩm' }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng' }} />
      <Tabs.Screen name="profile" options={{ title: 'Tài khoản' }} />
    </Tabs>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: shop.background,
    paddingTop: 8,
  },
  dock: {
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 38,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: shop.dockBorder,
    backgroundColor: shop.dock,
    boxShadow: shop.dockShadow,
  },
  row: { flexDirection: 'row', position: 'relative' },
  selection: {
    position: 'absolute',
    start: 2,
    top: 0,
    bottom: 0,
    borderRadius: 30,
    borderCurve: 'continuous',
    backgroundColor: shop.soft,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    paddingVertical: 6,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 30,
  },
  icon: { width: 24, height: 24 },
  label: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  selectedLabel: { fontWeight: '700' },
});
