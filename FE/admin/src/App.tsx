import { Button, Result, Spin } from 'antd';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { canAccess, startPage } from './auth/permissions';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import { DashboardPage, ProductsPage, CategoriesPage, CategorySpecificationsPage, BrandsPage, OrdersPage, CustomersPage, EmployeesPage, ReviewsPage, ContactsPage, AccountPage, ReportsPage, ShopOperationsPage } from './pageModules';
function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, loading, error, restore, logout } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <div className="loading-area"><Spin size="large" /></div>;
  if (error) return <Result status="error" title={error} extra={[<Button key="retry" onClick={restore}>Thử lại</Button>, <Button key="logout" onClick={logout}>Đăng xuất</Button>]} />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.vai_tro !== 'Admin') return <Result status="403" title="Bạn không có quyền truy cập trang này" />;
  if (pathname !== '/' && !canAccess(user, pathname.replace(/\/$/, ''))) return <Result status="403" title="Bạn không có quyền truy cập trang này" extra={<Button href={startPage(user)}>Về trang được cấp quyền</Button>} />;
  return <Outlet />;
}
function StartPage() { const { user } = useAuth(); return <Navigate to={startPage(user)} replace />; }
function EmployeePermissionsRedirect() { const { search } = useLocation(); return <Navigate to={`/employees${search}`} replace />; }
export default function App() {
  return <AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route element={<ProtectedRoute />}><Route element={<AdminLayout />}>
    <Route index element={<StartPage />} />
    <Route path="dashboard" element={<DashboardPage />} /><Route path="products" element={<ProductsPage />} />
    <Route path="categories" element={<CategoriesPage />} /><Route path="category-specifications" element={<CategorySpecificationsPage />} />
    <Route path="specifications" element={<Navigate to="/category-specifications" replace />} />
    <Route path="brands" element={<BrandsPage />} />
    <Route path="orders" element={<OrdersPage />} /><Route path="reviews" element={<ReviewsPage />} /><Route path="contacts" element={<ContactsPage />} />
    <Route path="account" element={<AccountPage/>}/><Route path="inventory" element={<ShopOperationsPage key="inventory" kind="inventory"/>}/>
    <Route path="reports" element={<ReportsPage/>}/>
    <Route path="vouchers" element={<ShopOperationsPage key="vouchers" kind="vouchers"/>}/>
    <Route element={<ProtectedRoute adminOnly />}><Route path="permissions" element={<EmployeePermissionsRedirect />} /><Route path="customers" element={<CustomersPage />} /><Route path="employees" element={<EmployeesPage />} /></Route>
  </Route></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AuthProvider>;
}
