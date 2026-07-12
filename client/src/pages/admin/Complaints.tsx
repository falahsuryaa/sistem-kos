import { useState } from 'react';
import type React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Search, Loader2, X, Eye,
  Clock, CheckCircle, Settings, XCircle
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING: { label: 'Menunggu', cls: 'badge-yellow', icon: Clock },
  IN_PROGRESS: { label: 'Diproses', cls: 'badge-emerald', icon: Settings },
  RESOLVED: { label: 'Selesai', cls: 'badge-green', icon: CheckCircle },
  CLOSED: { label: 'Ditutup', cls: 'badge-gray', icon: XCircle },
};

const CATEGORY_MAP: Record<string, string> = {
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  INTERNET: 'Internet',
  ROOM_DAMAGE: 'Kerusakan Kamar',
  COMMON_FACILITY: 'Fasilitas Umum',
  OTHER: 'Lainnya',
};

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  photos: string[];
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  tenant: { fullName: string; room: { roomNumber: string } | null };
}

export default function AdminComplaints() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/complaints?${params}`);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status?: string; adminNotes?: string }) =>
      api.put(`/complaints/${payload.id}`, { status: payload.status, adminNotes: payload.adminNotes }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      toast.success(res.data.message || 'Berhasil diperbarui');
      setDetail(null);
    },
    onError: () => toast.error('Gagal memperbarui keluhan'),
  });

  const complaints: Complaint[] = data?.data || [];
  const filtered = search
    ? complaints.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.tenant?.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : complaints;

  const openDetail = (c: Complaint) => {
    setDetail(c);
    setAdminNotes(c.adminNotes || '');
    setNewStatus(c.status);
  };

  const handleUpdate = () => {
    if (!detail) return;
    updateMutation.mutate({ id: detail.id, status: newStatus, adminNotes });
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Keluhan Penyewa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.meta?.total || 0} keluhan
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari keluhan..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="IN_PROGRESS">Diproses</option>
          <option value="RESOLVED">Selesai</option>
          <option value="CLOSED">Ditutup</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada keluhan</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Penyewa</th>
                <th>Kamar</th>
                <th>Judul</th>
                <th>Kategori</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const st = STATUS_MAP[c.status] || STATUS_MAP.PENDING;
                const StIcon = st.icon;
                return (
                  <tr key={c.id}>
                    <td className="font-medium">{c.tenant?.fullName || '-'}</td>
                    <td><span className="badge-emerald">#{c.tenant?.room?.roomNumber || '-'}</span></td>
                    <td className="max-w-48 truncate">{c.title}</td>
                    <td className="text-sm">{CATEGORY_MAP[c.category] || c.category}</td>
                    <td>
                      <span className={`badge ${st.cls}`}>
                        <StIcon className="w-3 h-3 mr-1" />
                        {st.label}
                      </span>
                    </td>
                    <td className="text-sm">{new Date(c.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      <button onClick={() => openDetail(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors">
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Detail Keluhan</h2>
              <button onClick={() => setDetail(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Penyewa</p>
                <p className="font-medium text-slate-900 dark:text-white">{detail.tenant?.fullName} — Kamar #{detail.tenant?.room?.roomNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Judul</p>
                <p className="font-semibold text-slate-900 dark:text-white">{detail.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Kategori</p>
                <span className="badge-emerald">{CATEGORY_MAP[detail.category] || detail.category}</span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Deskripsi</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{detail.description}</p>
              </div>
              {detail.photos.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Foto Bukti</p>
                  <div className="flex gap-2 flex-wrap">
                    {detail.photos.map((p, i) => (
                      <img
                        key={i}
                        src={p.startsWith('http') ? p : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${p}`}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={() => window.open(p.startsWith('http') ? p : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${p}`, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Tanggal Lapor</p>
                <p className="text-sm">{new Date(detail.createdAt).toLocaleString('id-ID')}</p>
              </div>
              <hr className="border-slate-200 dark:border-slate-700" />
              <div>
                <label className="label">Status</label>
                <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="PENDING">Menunggu</option>
                  <option value="IN_PROGRESS">Diproses</option>
                  <option value="RESOLVED">Selesai</option>
                  <option value="CLOSED">Ditutup</option>
                </select>
              </div>
              <div>
                <label className="label">Catatan Admin</label>
                <textarea className="input min-h-20" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Tambahkan catatan..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setDetail(null)} className="btn-secondary">Batal</button>
              <button onClick={handleUpdate} disabled={updateMutation.isPending} className="btn-primary">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
