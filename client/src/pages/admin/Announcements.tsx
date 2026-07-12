import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Megaphone, Plus, Search, Loader2, X, Edit2, Trash2, Pin, PinOff
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isActive: boolean;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdAt: string;
}

const EMPTY: Announcement = {
  id: '', title: '', content: '', category: 'GENERAL',
  isActive: true, isPinned: false, publishedAt: '', expiresAt: null, createdAt: '',
};

export default function AdminAnnouncements() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement>(EMPTY);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data } = await api.get('/announcements?limit=50');
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Announcement>) => api.post('/announcements', payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success(res.data.message); setShowModal(false); },
    onError: () => toast.error('Gagal membuat pengumuman'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Announcement> & { id: string }) => api.put(`/announcements/${payload.id}`, payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success(res.data.message); setShowModal(false); },
    onError: () => toast.error('Gagal memperbarui pengumuman'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Pengumuman dihapus'); },
    onError: () => toast.error('Gagal menghapus'),
  });

  const announcements: Announcement[] = data?.data || [];
  const filtered = search
    ? announcements.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()))
    : announcements;

  const openCreate = () => { setEditing(EMPTY); setShowModal(true); };
  const openEdit = (a: Announcement) => { setEditing(a); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.title || !editing.content) { toast.error('Judul dan isi wajib diisi'); return; }
    if (editing.id) {
      updateMutation.mutate(editing);
    } else {
      createMutation.mutate(editing);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus pengumuman ini?')) deleteMutation.mutate(id);
  };

  const togglePin = (a: Announcement) => {
    updateMutation.mutate({ id: a.id, isPinned: !a.isPinned });
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengumuman</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} pengumuman</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Buat Pengumuman
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari pengumuman..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada pengumuman</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.isPinned ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                  {a.isPinned ? <Pin className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{a.title}</h3>
                    {a.isPinned && <span className="badge-yellow text-xs">Disematkan</span>}
                    <span className="badge-emerald text-xs">{a.category}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{new Date(a.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => togglePin(a)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors" title={a.isPinned ? 'Lepas pin' : 'Pin'}>
                    {a.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editing.id ? 'Edit Pengumuman' : 'Buat Pengumuman'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Judul</label>
                <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Judul pengumuman" required />
              </div>
              <div>
                <label className="label">Isi Pengumuman</label>
                <textarea className="input min-h-28" value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Tulis isi pengumuman..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    <option value="GENERAL">Umum</option>
                    <option value="MAINTENANCE">Pemeliharaan</option>
                    <option value="PAYMENT">Pembayaran</option>
                    <option value="EVENT">Acara</option>
                    <option value="RULES">Peraturan</option>
                  </select>
                </div>
                <div className="flex items-end pb-1 gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={editing.isPinned} onChange={(e) => setEditing({ ...editing, isPinned: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
                    <span className="text-slate-700 dark:text-slate-300">Sematkan</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing.id ? 'Simpan' : 'Buat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
