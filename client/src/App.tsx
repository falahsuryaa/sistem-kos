import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import VerifyTenant from './pages/public/VerifyTenant';

// Admin Layout & Pages
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminRooms from './pages/admin/Rooms';
import AdminTenants from './pages/admin/Tenants';
import AdminInvoices from './pages/admin/Invoices';
import AdminPayments from './pages/admin/Payments';
import AdminComplaints from './pages/admin/Complaints';
import AdminAnnouncements from './pages/admin/Announcements';
import AdminReports from './pages/admin/Reports';
import AdminExpenses from './pages/admin/Expenses';
import AdminBookings from './pages/admin/Bookings';

// Tenant Layout & Pages
import TenantLayout from './layouts/TenantLayout';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantInvoices from './pages/tenant/TenantInvoices';
import TenantPayments from './pages/tenant/TenantPayments';
import TenantComplaints from './pages/tenant/TenantComplaints';
import TenantProfile from './pages/tenant/TenantProfile';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles?: string[] }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'TENANT' ? '/tenant' : '/admin'} replace />;
  }
  return <>{children}</>;
};

function App() {
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
    const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
    const scriptUrl = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js' 
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
      
    // Load Midtrans Snap Script dynamically if not present
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.setAttribute('data-client-key', clientKey || '');
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/verify-tenant/:id" element={<VerifyTenant />} />
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={user?.role === 'TENANT' ? '/tenant' : '/admin'} replace />
            : <LoginPage />
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="rooms" element={<AdminRooms />} />
        <Route path="tenants" element={<AdminTenants />} />
        <Route path="invoices" element={<AdminInvoices />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="bookings" element={<AdminBookings />} />
      </Route>

      {/* Tenant Routes */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowedRoles={['TENANT']}>
            <TenantLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TenantDashboard />} />
        <Route path="invoices" element={<TenantInvoices />} />
        <Route path="payments" element={<TenantPayments />} />
        <Route path="complaints" element={<TenantComplaints />} />
        <Route path="profile" element={<TenantProfile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
