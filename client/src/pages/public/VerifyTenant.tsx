import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck, Calendar, Home, Phone, Mail, Loader2 } from 'lucide-react';
import api from '../../lib/api';

export default function VerifyTenant() {
  const { id } = useParams<{ id: string }>();

  const { data: tenantRes, isLoading, isError } = useQuery({
    queryKey: ['public-verify-tenant', id],
    queryFn: async () => {
      const { data } = await api.get(`/tenants/public-verify/${id}`);
      return data.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Memverifikasi kartu identitas digital...</p>
        </div>
      </div>
    );
  }

  if (isError || !tenantRes) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-red-100 dark:border-red-950/20">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-500">
            <ShieldCheck className="w-8 h-8 opacity-50" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verifikasi Gagal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Data identitas digital tidak ditemukan atau sudah tidak aktif. Silakan hubungi pengelola Kos Ciparay.
          </p>
          <div className="pt-2">
            <Link to="/" className="btn-primary w-full justify-center">Kembali ke Beranda</Link>
          </div>
        </div>
      </div>
    );
  }

  const isActive = tenantRes.isActive;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="relative max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        {/* Header decoration */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 flex flex-col justify-end p-6 relative">
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Home className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Kos Ciparay</span>
          </div>
          
          {/* verified float badge */}
          <div className="absolute -bottom-6 right-6 w-28 h-28 bg-emerald-500/10 dark:bg-emerald-400/10 border-2 border-dashed border-emerald-500 dark:border-emerald-400 rounded-full flex flex-col items-center justify-center transform rotate-12 backdrop-blur-xs select-none">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mb-0.5 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">VERIFIED</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 pt-10 space-y-6">
          {/* Tenant profile block */}
          <div className="flex items-center gap-4">
            {tenantRes.photo ? (
              <img
                src={tenantRes.photo}
                alt={tenantRes.fullName}
                className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md border-2 border-white dark:border-slate-800">
                {tenantRes.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{tenantRes.fullName}</h2>
              <span className={`inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold
                ${isActive
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/20'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {isActive ? 'Anggota Aktif' : 'Sudah Keluar'}
              </span>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Details list */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Home className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nomor Kamar</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">Kamar {tenantRes.roomNumber} ({tenantRes.roomName})</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tanggal Masuk</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                  {new Date(tenantRes.checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kontak</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{tenantRes.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Email</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{tenantRes.email}</p>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* Footer Card info */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Halaman ini adalah bukti resmi verifikasi keanggotaan aktif dari penghuni **Kos Ciparay**.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
