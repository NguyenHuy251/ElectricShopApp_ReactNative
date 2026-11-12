import { lazy } from 'react';

const loaders = {
  '/dashboard': () => import('./pages/DashboardPage'),
  '/products': () => import('./pages/ProductsPage'),
  '/categories': () => import('./pages/CategoriesPage'),
  '/category-specifications': () => import('./pages/CategorySpecificationsPage'),
  '/brands': () => import('./pages/BrandsPage'),
  '/orders': () => import('./pages/OrdersPage'),
  '/customers': () => import('./pages/CustomersPage'),
  '/employees': () => import('./pages/EmployeesPage'),
  '/reviews': () => import('./pages/ReviewsPage'),
  '/contacts': () => import('./pages/ContactsPage'),
  '/account': () => import('./pages/AccountPage'),
  '/reports': () => import('./pages/ReportsPage'),
  '/inventory': () => import('./pages/ShopOperationsPage'),
};
type PagePath = keyof typeof loaders;
const pending = new Map<PagePath, Promise<unknown>>();
function loadPage<K extends PagePath>(path: K): ReturnType<(typeof loaders)[K]> {
  if (!pending.has(path)) {
    pending.set(path, loaders[path]().catch(error => { pending.delete(path); throw error; }));
  }
  return pending.get(path) as ReturnType<(typeof loaders)[K]>;
}
export function preloadPage(path: string) {
  const key = path === '/vouchers' ? '/inventory' : path;
  if (key in loaders) return loadPage(key as PagePath);
}

export const DashboardPage = lazy(() => loadPage('/dashboard'));
export const ProductsPage = lazy(() => loadPage('/products'));
export const CategoriesPage = lazy(() => loadPage('/categories'));
export const CategorySpecificationsPage = lazy(() => loadPage('/category-specifications'));
export const BrandsPage = lazy(() => loadPage('/brands'));
export const OrdersPage = lazy(() => loadPage('/orders'));
export const CustomersPage = lazy(() => loadPage('/customers'));
export const EmployeesPage = lazy(() => loadPage('/employees'));
export const ReviewsPage = lazy(() => loadPage('/reviews'));
export const ContactsPage = lazy(() => loadPage('/contacts'));
export const AccountPage = lazy(() => loadPage('/account'));
export const ReportsPage = lazy(() => loadPage('/reports'));
export const ShopOperationsPage = lazy(() => loadPage('/inventory'));
