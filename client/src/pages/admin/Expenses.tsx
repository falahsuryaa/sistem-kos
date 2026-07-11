import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, Plus, Search, Loader2, X, Edit2, Trash2,
  Zap, Droplets, Wifi, Wrench, Sparkles, Wallet, MoreHorizontal
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

const CATEGORY_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ELECTRICITY: { label: 'Listrik', icon: Zap, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  WATER: { label: 'Air', icon: Droplets, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400' },
  INTERNET: { label: 'Internet', icon: Wifi, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  MAINTENANCE: { label: 'Perawatan', icon: Wrench, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  CLEANING: { label: 'Kebersihan', icon: Sparkles, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  SALARY: { label: 'Gaji', icon: Wallet, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  OTHER: { label: 'Lainnya', icon: MoreHorizontal, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
};

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
}

const EMPTY: Expense = { id: '', title: '', amount: 0, category: 'OTHER', date: new Date().toISOString().split('T')[0], description: null };

export default function AdminExpenses() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense>(EMPTY);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/expenses?${params}`);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Expense>) => api.post('/expenses', payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success(res.data.message); setShowModal(false); },
    onError: () => toast.error('Gagal menambahkan pengeluaran'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Expense> & { id: string }) => api.put(`/expenses/${payload.id}`, payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success(res.data.message); setShowModal(false); },
    onError: () => toast.error('Gagal memperbarui pengeluaran'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Pengeluaran dihapus'); },
    onError: () => toast.error('Gagal menghapus'),
  });

  const expenses: Expense[] = data?.data || [];
  const totalAmount = data?.meta?.totalAmount || 0;
  const filtered = search
    ? expenses.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : expenses;

  const openCreate = () => { setEditing({ ...EMPTY, date: new Date().toISOString().split('T')[0] }); setShowModal(true); };
  const openEdit = (e: Expense) => { setEditing({ ...e, date: new Date(e.date).toISOString().split('T')[0] }); setShowModal(true); };
  const handleDelete = (id: string) => { if (confirm('Hapus pengeluaran ini?')) deleteMutation.mutate(id); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.title || !editing.amount) { toast.error('Judul dan nominal wajib diisi'); return; }
    if (editing.id) {
      updateMutation.mutate(editing);
    } else {
      createMutation.mutate(editing);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengeluaran Kos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {data?.meta?.total || 0} pengeluaran — Total: <span className="font-semibold text-red-500">{formatRupiah(totalAmount)}</span>
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Pengeluaran
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari pengeluaran..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Semua Kategori</option>
          {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada pengeluaran</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Pengeluaran</th>
                <th>Kategori</th>
                <th>Tanggal</th>
                <th>Nominal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exp) => {
                const cat = CATEGORY_MAP[exp.category] || CATEGORY_MAP.OTHER;
                const CatIcon = cat.icon;
                return (
                  <tr key={exp.id}>
                    <td>
                      <p className="font-medium text-slate-900 dark:text-white">{exp.title}</p>
                      {exp.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{exp.description}</p>}
                    </td>
                    <td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cat.color}`}>
                        <CatIcon className="w-3.5 h-3.5" /> {cat.label}
                      </span>
                    </td>
                    <td className="text-sm">{new Date(exp.date).toLocaleDateString('id-ID')}</td>
                    <td className="font-semibold text-red-500">{formatRupiah(Number(exp.amount))}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editing.id ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Judul</label>
                <input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Contoh: Bayar listrik bulan Juli" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nominal (Rp)</label>
                  <input type="number" className="input" value={editing.amount || ''} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} placeholder="500000" required />
                </div>
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Tanggal</label>
                <input type="date" className="input" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Keterangan (opsional)</label>
                <textarea className="input min-h-16" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Keterangan tambahan..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing.id ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
