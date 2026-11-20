import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet } from 'react-native';
import { useShopAppearance } from '@/components/shop-appearance';
import { Pressable } from '@/components/ui';

export function AppearanceButton() {
  const { scheme, shop, setScheme } = useShopAppearance();
  const dark = scheme === 'dark';

  return (
    <Pressable
      accessibilityLabel={dark ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
      onPress={() => setScheme(dark ? 'light' : 'dark')}
      style={[styles.button, { backgroundColor: shop.surface, borderColor: shop.border }]}
    >
      <MaterialIcons name={dark ? 'light-mode' : 'dark-mode'} size={23} color={shop.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
