import { useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppearanceButton } from '@/components/appearance-button';
import { NotificationBell } from '@/components/notification-bell';

export function TabHeaderActions() {
  const focused = useIsFocused();

  return (
    <View style={styles.actions}>
      {focused && (
        <>
          <AppearanceButton />
          <NotificationBell />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    flexShrink: 0,
    minWidth: 100,
    minHeight: 46,
    gap: 8,
  },
});
