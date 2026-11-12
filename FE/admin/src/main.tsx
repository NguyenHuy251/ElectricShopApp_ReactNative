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
    <ConfigProvider locale={viVN} theme={{ token: { motion: !reducedMotion, colorPrimary: '#087f8c', colorText: '#152d46', colorTextSecondary: '#66788a', colorBorder: '#e2e9f1', borderRadius: 10, controlHeight: 40, fontFamily: '"Segoe UI", sans-serif' }, components: { Table: { headerBg: '#f6f8fc', headerColor: '#66788a', cellPaddingBlock: 16 }, Button: { primaryShadow: '0 4px 10px #087f8c20' }, Card: { borderRadiusLG: 16 } } }}><AntApp><App /></AntApp></ConfigProvider>
  </BrowserRouter>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AdminApplication /></React.StrictMode>);
