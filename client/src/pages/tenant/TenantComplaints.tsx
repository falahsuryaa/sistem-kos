import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Plus, Loader2, X, Clock, CheckCircle, Settings, XCircle
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
  ELECTRICITY: 'Listrik', WATER: 'Air', INTERNET: 'Internet',
  ROOM_DAMAGE: 'Kerusakan Kamar', COMMON_FACILITY: 'Fasilitas Umum', OTHER: 'Lainnya',
};

export default function TenantComplaints() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-my-complaints'],
    queryFn: async () => {
      const { data } = await api.get('/complaints/my');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      const { data } = await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tenant-my-complaints'] });
      toast.success(res.message || 'Keluhan berhasil diajukan');
      setShowForm(false);
      setTitle('');
      setDescription('');
      setCategory('OTHER');
    },
    onError: () => toast.error('Gagal mengirim keluhan'),
  });

  const complaints = data?.data || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) { toast.error('Judul dan deskripsi wajib diisi'); return; }
    createMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Keluhan Saya</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{complaints.length} keluhan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Buat Keluhan
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : complaints.length === 0 ? (
        <div className="card p-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada keluhan</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto">
            <Plus className="w-4 h-4" /> Buat Keluhan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => {
            const st = STATUS_MAP[c.status] || STATUS_MAP.PENDING;
            const StIcon = st.icon;
            return (
              <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    c.status === 'RESOLVED' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    c.status === 'IN_PROGRESS' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    c.status === 'CLOSED' ? 'bg-slate-100 dark:bg-slate-700' :
                    'bg-amber-100 dark:bg-amber-900/30'
                  }`}>
                    <StIcon className={`w-5 h-5 ${
                      c.status === 'RESOLVED' ? 'text-emerald-600 dark:text-emerald-400' :
                      c.status === 'IN_PROGRESS' ? 'text-emerald-600 dark:text-emerald-400' :
                      c.status === 'CLOSED' ? 'text-slate-500' :
                      'text-amber-600 dark:text-amber-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{c.title}</h3>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="badge-emerald">{CATEGORY_MAP[c.category] || c.category}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                    {c.adminNotes && (
                      <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">Catatan Admin:</p>
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">{c.adminNotes}</p>
                      </div>
                    )}
                    {c.resolvedAt && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                        ✅ Diselesaikan pada {new Date(c.resolvedAt).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Complaint Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Buat Keluhan Baru</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Judul Keluhan</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: AC tidak dingin" required />
              </div>
              <div>
                <label className="label">Kategori</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="ELECTRICITY">Listrik</option>
                  <option value="WATER">Air</option>
                  <option value="INTERNET">Internet</option>
                  <option value="ROOM_DAMAGE">Kerusakan Kamar</option>
                  <option value="COMMON_FACILITY">Fasilitas Umum</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="label">Deskripsi</label>
                <textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan keluhan Anda secara detail..." required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Kirim Keluhan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
