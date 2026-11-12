import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { App as AntApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const subscribeMotion = (notify: () => void) => {
  reducedMotionQuery.addEventListener('change', notify);
  return () => reducedMotionQuery.removeEventListener('change', notify);
};
const getReducedMotion = () => reducedMotionQuery.matches;

function AdminApplication() {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion);
  // Let Ant Design disable its motion lifecycle, rather than removing CSS
  // animations while popup positioning/closing still waits for their events.
  return <BrowserRouter>
    <ConfigProvider locale={viVN} theme={{ token: { motion: !reducedMotion, colorPrimary: '#126b60', colorInfo: '#126b60', colorSuccess: '#28704e', colorWarning: '#a16b22', colorError: '#b84444', colorText: '#182d2a', colorTextSecondary: '#6a7c76', colorBorder: '#dfe7e2', colorBgLayout: '#f5f7f6', borderRadius: 10, controlHeight: 40, fontSize: 14, fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif' }, components: { Table: { headerBg: '#f6f8f7', headerColor: '#6a7c76', cellPaddingBlock: 16, rowHoverBg: '#f2f7f4' }, Button: { primaryShadow: '0 2px 4px #126b6014', fontWeight: 600 }, Card: { borderRadiusLG: 16 }, Modal: { borderRadiusLG: 18, titleFontSize: 19 }, Tabs: { inkBarColor: '#126b60' } } }}><AntApp><App /></AntApp></ConfigProvider>
  </BrowserRouter>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminApplication /></React.StrictMode>);
