import { Suspense, useEffect, useState } from 'react';
import { Drawer, Spin } from 'antd';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { navigation } from './Sidebar';
import Topbar from './Topbar';
import { preloadPage } from '../pageModules';
import { useAuth } from '../auth/AuthContext';
import { canAccess } from '../auth/permissions';
import { usePendingCounts } from '../hooks/usePendingCounts';
export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { counts, refresh } = usePendingCounts(user);
  const title = navigation.find(([path]) => path === pathname)?.[1] || 'Quản trị';
  useEffect(() => { document.title = `${title} | ElectricShop`; setOpen(false); }, [title, pathname]);
  useEffect(() => {
    // Warm only frequently used, authorized page modules after initial paint.
    // No API data is prefetched or retained across sessions.
    const paths = ['/products', '/orders', '/employees'].filter(path => canAccess(user, path));
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      for (const path of paths) {
        if (cancelled) return;
        try { await preloadPage(path); } catch { /* Retry on navigation. */ }
      }
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [user?.ma_tai_khoan, user?.vai_tro, user?.permissions?.join(',')]);
  return <div className={`layout${sidebarHidden ? ' sidebar-hidden' : ''}`}><div className="desktop-sidebar" id="admin-sidebar"><Sidebar counts={counts} /></div><Drawer title="Menu quản trị" placement="left" open={open} onClose={() => setOpen(false)} width={280}><Sidebar counts={counts} onNavigate={() => setOpen(false)} /></Drawer><main className="main"><Topbar title={title} toggle={() => setOpen(true)} sidebarHidden={sidebarHidden} toggleSidebar={() => setSidebarHidden(hidden => !hidden)} /><div className="page"><Suspense fallback={<Spin tip="Đang tải trang"><div className="loading-area" /></Spin>}><Outlet context={refresh} /></Suspense></div></main></div>;
}
