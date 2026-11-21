import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/api';
import { canAccess } from '../auth/permissions';
import type { User } from '../types';

const endpoints = { orders: '/don-hang/pending-count', inbox: '/inbox/pending-count' };
export type PendingKind = keyof typeof endpoints;
export type PendingCounts = Partial<Record<PendingKind, number>>;
export type RefreshPendingCount = (kind: PendingKind) => void;

export function usePendingCounts(user: User | null) {
  const canViewOrders = canAccess(user, '/orders');
  const canViewInbox = canAccess(user, '/contacts');
  const [counts, setCounts] = useState<PendingCounts>({});
  const requests = useRef<Partial<Record<PendingKind, AbortController>>>({});

  const refresh = useCallback<RefreshPendingCount>(kind => {
    if (!(kind === 'orders' ? canViewOrders : canViewInbox)) return;
    requests.current[kind]?.abort();
    const request = new AbortController();
    requests.current[kind] = request;
    void api.get<{ data: { count: number } }>(endpoints[kind], { signal: request.signal }).then(({ data }) => {
      const count = data.data?.count;
      if (!request.signal.aborted && Number.isSafeInteger(count) && count >= 0) {
        setCounts(previous => previous[kind] === count ? previous : { ...previous, [kind]: count });
      }
    }).catch(() => {
      // Keep the last known value and retry at the next refresh.
    }).finally(() => {
      if (requests.current[kind] === request) delete requests.current[kind];
    });
  }, [canViewOrders, canViewInbox]);

  useEffect(() => {
    setCounts({});
    if (!canViewOrders && !canViewInbox) return;
    const poll = () => {
      if (document.hidden) return;
      if (!requests.current.orders) refresh('orders');
      if (!requests.current.inbox) refresh('inbox');
    };
    poll();
    const timer = window.setInterval(poll, 15000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
      requests.current.orders?.abort();
      requests.current.inbox?.abort();
      requests.current = {};
    };
  }, [refresh, canViewOrders, canViewInbox, user?.ma_tai_khoan]);

  return { counts, refresh };
}
