import { useQuery } from '@tanstack/react-query';
import {
  BedDouble, FileText, CreditCard, MessageSquare, Megaphone,
  Loader2, CheckCircle, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

export default function TenantDashboard() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => {
      const { data } = await api.get('/tenants/me');
      return data.data;
    },
  });

  const { data: invoices } = useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/invoices/my');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: complaints } = useQuery({
    queryKey: ['tenant-my-complaints'],
    queryFn: async () => {
      const { data } = await api.get('/complaints/my');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: announcements } = useQuery({
    queryKey: ['tenant-announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements?limit=5');
      return data.data;
    },
  });

  if (profileLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data...</p>
      </div>
    </div>
  );

  const pendingInvoices = invoices?.filter((i: any) => i.status === 'PENDING' || i.status === 'OVERDUE') || [];
  const activeComplaints = complaints?.filter((c: any) => c.status === 'PENDING' || c.status === 'IN_PROGRESS') || [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-r from-blue-600 to-blue-700 border-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{profile?.fullName?.charAt(0).toUpperCase()}</span>
          </div>
          <div className="text-white">
            <h1 className="text-xl font-bold">Selamat datang, {profile?.fullName?.split(' ')[0]}! 👋</h1>
            <p className="text-blue-100 text-sm mt-0.5">
              Kamar #{profile?.room?.roomNumber || '-'} — {profile?.room?.name || 'Tidak ada kamar'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <BedDouble className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">#{profile?.room?.roomNumber || '-'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kamar Saya</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{pendingInvoices.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tagihan Pending</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatRupiah(Number(profile?.room?.monthlyPrice || 0))}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sewa/Bulan</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{activeComplaints.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Keluhan Aktif</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Invoices */}
        <div className="card">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" /> Tagihan Menunggu
            </h3>
            <Link to="/tenant/invoices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingInvoices.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {pendingInvoices.slice(0, 3).map((inv: any) => (
                <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500">{inv.periodMonth}/{inv.periodYear} — Jatuh tempo {new Date(inv.dueDate).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600 dark:text-blue-400 text-sm">{formatRupiah(Number(inv.totalAmount))}</p>
                    <span className={`badge text-xs ${inv.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}`}>
                      {inv.status === 'OVERDUE' ? 'Terlambat' : 'Menunggu'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Tidak ada tagihan menunggu
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-500" /> Pengumuman
            </h3>
          </div>
          {announcements && announcements.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {announcements.slice(0, 4).map((a: any) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                    {a.isPinned && <span className="badge-yellow text-xs">📌</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">Belum ada pengumuman</div>
          )}
        </div>

        {/* Active Complaints */}
        <div className="card lg:col-span-2">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-500" /> Keluhan Aktif
            </h3>
            <Link to="/tenant/complaints" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {activeComplaints.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {activeComplaints.slice(0, 3).map((c: any) => (
                <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{c.title}</p>
                    <p className="text-xs text-slate-500">{c.category} — {new Date(c.createdAt).toLocaleDateString('id-ID')}</p>
                  </div>
                  <span className={`badge text-xs ${c.status === 'IN_PROGRESS' ? 'badge-blue' : 'badge-yellow'}`}>
                    {c.status === 'IN_PROGRESS' ? 'Diproses' : 'Menunggu'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">Tidak ada keluhan aktif</div>
          )}
        </div>
      </div>
    </div>
  );
}
