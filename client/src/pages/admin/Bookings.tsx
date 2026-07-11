import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Loader2, Eye, X, CheckCircle, XCircle,
  Clock, Ban, Check
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING: { label: 'Menunggu', cls: 'badge-yellow', icon: Clock },
  APPROVED: { label: 'Disetujui', cls: 'badge-green', icon: CheckCircle },
  REJECTED: { label: 'Ditolak', cls: 'badge-red', icon: XCircle },
  CANCELLED: { label: 'Dibatalkan', cls: 'badge-gray', icon: Ban },
  COMPLETED: { label: 'Selesai', cls: 'badge-blue', icon: Check },
};

interface Booking {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nik: string;
  checkInDate: string;
  duration: number;
  notes: string | null;
  status: string;
  dpAmount: number | null;
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  room: { roomNumber: string; name: string; monthlyPrice: number };
}

export default function AdminBookings() {
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Booking | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/bookings?${params}`);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: string; adminNotes?: string }) =>
      api.put(`/bookings/${payload.id}`, payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(res.data.message || 'Status booking diperbarui');
      setDetail(null);
    },
    onError: () => toast.error('Gagal memperbarui booking'),
  });

  const bookings: Booking[] = data?.data || [];

  const openDetail = (b: Booking) => {
    setDetail(b);
    setAdminNotes(b.adminNotes || '');
  };

  const handleAction = (status: string) => {
    if (!detail) return;
    updateMutation.mutate({ id: detail.id, status, adminNotes });
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Booking Kamar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} booking</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3">
        <select className="input w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="COMPLETED">Selesai</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : bookings.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada booking</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No. HP</th>
                <th>Kamar</th>
                <th>Check-in</th>
                <th>Durasi</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const st = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
                const StIcon = st.icon;
                return (
                  <tr key={b.id}>
                    <td className="font-medium">{b.fullName}</td>
                    <td className="text-sm">{b.phone}</td>
                    <td><span className="badge-blue">#{b.room?.roomNumber}</span></td>
                    <td className="text-sm">{new Date(b.checkInDate).toLocaleDateString('id-ID')}</td>
                    <td className="text-sm">{b.duration} bulan</td>
                    <td>
                      <span className={`badge ${st.cls}`}>
                        <StIcon className="w-3 h-3 mr-1" />
                        {st.label}
                      </span>
                    </td>
                    <td className="text-sm">{new Date(b.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      <button onClick={() => openDetail(b)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detail Booking</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Nama Lengkap</p>
                  <p className="font-medium text-slate-900 dark:text-white">{detail.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">NIK</p>
                  <p className="font-mono text-sm">{detail.nik}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Email</p>
                  <p className="text-sm">{detail.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">No. HP</p>
                  <p className="text-sm">{detail.phone}</p>
                </div>
              </div>
              <hr className="border-slate-200 dark:border-slate-700" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kamar</p>
                  <p className="font-medium">#{detail.room?.roomNumber} — {detail.room?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Harga/Bulan</p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">{formatRupiah(Number(detail.room?.monthlyPrice))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal Check-in</p>
                  <p className="text-sm">{new Date(detail.checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Durasi</p>
                  <p className="text-sm">{detail.duration} bulan</p>
                </div>
              </div>
              {detail.notes && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Catatan Pemesan</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{detail.notes}</p>
                </div>
              )}
              <hr className="border-slate-200 dark:border-slate-700" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status Saat Ini</p>
                <span className={`badge ${(STATUS_MAP[detail.status] || STATUS_MAP.PENDING).cls}`}>
                  {(STATUS_MAP[detail.status] || STATUS_MAP.PENDING).label}
                </span>
              </div>
              <div>
                <label className="label">Catatan Admin</label>
                <textarea className="input min-h-16" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Catatan untuk pemrosesan..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setDetail(null)} className="btn-secondary">Tutup</button>
              {detail.status === 'PENDING' && (
                <>
                  <button onClick={() => handleAction('REJECTED')} disabled={updateMutation.isPending} className="btn-danger">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Tolak
                  </button>
                  <button onClick={() => handleAction('APPROVED')} disabled={updateMutation.isPending} className="btn-success">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Setujui
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
