import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CreditCard, MessageSquare,
  User, Moon, Sun, Bell, LogOut, Menu, X, Home, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const navItems = [
  { path: '/tenant', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/tenant/invoices', label: 'Tagihan Saya', icon: FileText },
  { path: '/tenant/payments', label: 'Riwayat Bayar', icon: CreditCard },
  { path: '/tenant/complaints', label: 'Keluhan', icon: MessageSquare },
  { path: '/tenant/profile', label: 'Profil Saya', icon: User },
];

export default function TenantLayout() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const { data: notifications } = useQuery({
    queryKey: ['tenant-notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications?unreadOnly=true&limit=5');
      return data;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-notifications'] });
    },
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Topbar */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo */}
          <Link to="/tenant" className="flex items-center gap-2.5 mr-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
              <Home className="w-4.5 h-4.5 text-white" style={{ width: '18px', height: '18px' }} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white text-base hidden sm:block">Kos Ciparay</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${location.pathname === item.path
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-yellow-400 dark:hover:bg-slate-700 transition-all"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {notifications?.meta?.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {notifications.meta.unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-modal border border-slate-200 dark:border-slate-700 z-50 animate-scale-in">
                  <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifikasi</h3>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications?.data && notifications.data.length > 0 ? (
                      notifications.data.map((n: { id: string; title: string; message: string; type: string; createdAt: string }) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markReadMutation.mutate(n.id);
                          }}
                          className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 last:border-0 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{n.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-sm">Tidak ada notifikasi baru</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">{user?.name}</span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 space-y-1 animate-slide-in">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${location.pathname === item.path
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-400'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
}
