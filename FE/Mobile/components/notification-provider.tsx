import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { notificationService } from '@/services/notification.service';

const NotificationContext = createContext({
  notifications: 0,
  inbox: 0,
  refresh: async () => {},
});

export function NotificationProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [counts, setCounts] = useState({ notifications: 0, inbox: 0 });
  const generation = useRef(0);
  const pending = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve();
    if (pending.current) return pending.current;
    const version = generation.current;
    const request: Promise<void> = notificationService
      .unreadCounts()
      .then((next) => {
        if (generation.current === version) setCounts(next);
      })
      .catch(() => {
        // A temporary network failure must not erase an existing unread badge.
      })
      .finally(() => {
        if (pending.current === request) pending.current = null;
      });
    pending.current = request;
    return request;
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const version = generation;
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 10000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      version.current++;
      pending.current = null;
      clearInterval(timer);
      listener.remove();
    };
  }, [enabled, refresh]);
  return (
    <NotificationContext.Provider value={{ ...counts, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
