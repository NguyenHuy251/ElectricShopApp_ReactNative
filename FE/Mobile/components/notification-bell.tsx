import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNotifications } from '@/components/notification-provider';
import { Pressable, Text } from '@/components/ui';
import { useShopStyles } from '@/components/shop-appearance';
import { type ShopPalette } from '@/constants/shop-theme';

export function NotificationBell() {
  const { shop, styles } = useShopStyles(makeStyles);
  const { notifications, inbox, refresh } = useNotifications();
  const unread = notifications + inbox;

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  return (
    <Link href="/notifications" asChild>
      <Pressable
        accessibilityLabel={unread ? `Mở thông báo, ${unread} cập nhật chưa đọc` : 'Mở thông báo'}
        style={styles.button}
      >
        <MaterialIcons name="notifications-none" size={25} color={shop.ink} />
        {unread > 0 && (
          <View aria-hidden style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const makeStyles = (shop: ShopPalette) => StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: shop.surface,
    borderWidth: 1,
    borderColor: shop.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 15,
    backgroundColor: shop.action,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: shop.background,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
