import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { HapticTab } from '@/components/haptic-tab';
import { shop } from '@/constants/shop-theme';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/use-reduced-motion';


function TabIcon({ name, focused, reducedMotion }: { name: React.ComponentProps<typeof MaterialIcons>['name']; focused: boolean; reducedMotion: boolean }) {
  const [lift] = useState(() => new Animated.Value(focused ? -12 : 0));
  useEffect(() => {
    if (reducedMotion) { lift.setValue(focused ? -12 : 0); return; }
    const transition = Animated.timing(lift, { toValue: focused ? -12 : 0, duration: 180, useNativeDriver: true });
    transition.start();
    return () => transition.stop();
  }, [focused, reducedMotion, lift]);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.iconSlot}>
    <Animated.View style={[styles.iconCircle, focused && styles.activeCircle, { transform: [{ translateY: lift }] }]}>
      <MaterialIcons size={focused ? 26 : 24} name={name} color={focused ? shop.surface : shop.muted} />
    </Animated.View>
  </View>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: shop.primary,
        tabBarInactiveTintColor: shop.muted,
        tabBarStyle: { backgroundColor: shop.surface, borderTopColor: shop.border, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: 70 + Math.max(insets.bottom, 10), paddingBottom: Math.max(insets.bottom, 10), paddingTop: 8, elevation: 4, shadowColor: shop.ink, shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.08, shadowRadius: 16, overflow: 'visible' },
        tabBarItemStyle: { overflow: 'visible' },
        tabBarIconStyle: { width: 60, height: 36, overflow: 'visible' },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18, minHeight: 18, flexShrink: 0, fontWeight: '700', marginTop: 4 },
        sceneStyle: { backgroundColor: shop.background },
        headerShown: false,
        tabBarButton: HapticTab as any,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} reducedMotion={reducedMotion} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ focused }) => <TabIcon name="grid-view" focused={focused} reducedMotion={reducedMotion} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ hàng',
          tabBarIcon: ({ focused }) => <TabIcon name="shopping-cart" focused={focused} reducedMotion={reducedMotion} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} reducedMotion={reducedMotion} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSlot: { width: 60, height: 36, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  activeCircle: { backgroundColor: shop.primary, borderColor: shop.surface, shadowColor: shop.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
});
