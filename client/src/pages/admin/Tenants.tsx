import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Users, X, Loader2, UserCheck, UserX } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Tenant {
  id: string; userId: string; fullName: string; nik: string; phone: string; email: string;
  gender: string; address: string; checkInDate: string; checkOutDate: string | null;
  isActive: boolean; photo: string | null; qrCode: string | null;
  room: { roomNumber: string; name: string; monthlyPrice: number } | null;
}

export default function AdminTenants() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', search, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeFilter) params.set('isActive', activeFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/tenants?${params}`);
      return data;
    },
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-available'],
    queryFn: async () => {
      const { data } = await api.get('/rooms?status=AVAILABLE&limit=50');
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Penghuni dinonaktifkan'); },
    onError: () => toast.error('Gagal menghapus'),
  });

  const tenants: Tenant[] = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Penyewa</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} penyewa terdaftar</p>
        </div>
        <button onClick={() => { setEditTenant(undefined); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Penyewa
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama, NIK, HP..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
          <option value="">Semua</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : tenants.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada penyewa</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kamar</th>
                <th>HP</th>
                <th>Masuk</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {t.fullName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{t.fullName}</p>
                        <p className="text-xs text-slate-400">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {t.room ? (
                      <span className="badge-blue">Kamar {t.room.roomNumber}</span>
                    ) : (
                      <span className="badge-gray">Belum ada</span>
                    )}
                  </td>
                  <td className="text-sm">{t.phone}</td>
                  <td className="text-sm">{new Date(t.checkInDate).toLocaleDateString('id-ID')}</td>
                  <td>
                    {t.isActive ? (
                      <span className="badge-green"><UserCheck className="w-3 h-3 mr-1" />Aktif</span>
                    ) : (
                      <span className="badge-red"><UserX className="w-3 h-3 mr-1" />Nonaktif</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditTenant(t); setShowModal(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm(`Nonaktifkan ${t.fullName}?`)) deleteMutation.mutate(t.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TenantModal tenant={editTenant} rooms={roomsData || []} onClose={() => { setShowModal(false); setEditTenant(undefined); }} />
      )}
    </div>
  );
}

function TenantModal({ tenant, rooms, onClose }: { tenant?: Tenant; rooms: { id: string; roomNumber: string; name: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: tenant?.fullName || '', nik: tenant?.nik || '', phone: tenant?.phone || '',
    email: tenant?.email || '', gender: tenant?.gender || 'MALE', address: tenant?.address || '',
    checkInDate: tenant?.checkInDate ? new Date(tenant.checkInDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    roomId: (tenant?.room as any)?.id || '',
    password: '',
  });

  const mutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      if (tenant) {
        return api.put(`/tenants/${tenant.id}`, data);
      }
      // Create user first, then tenant
      const userRes = await api.post('/auth/register', { email: data.email, password: data.password || 'password123', name: data.fullName, phone: data.phone });
      const userId = userRes.data.data.user.id;
      return api.post('/tenants', { ...data, userId });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success(tenant ? 'Penyewa diperbarui!' : 'Penyewa ditambahkan!'); onClose(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menyimpan'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{tenant ? 'Edit Penyewa' : 'Tambah Penyewa'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nama Lengkap *</label>
              <input required className="input" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
            </div>
            <div>
              <label className="label">NIK *</label>
              <input required className="input" value={form.nik} onChange={e => setForm({...form, nik: e.target.value})} maxLength={16} />
            </div>
            <div>
              <label className="label">No. HP *</label>
              <input required className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="label">Email *</label>
              <input required type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="label">Jenis Kelamin</label>
              <select className="input" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="label">Kamar</label>
              <select className="input" value={form.roomId} onChange={e => setForm({...form, roomId: e.target.value})}>
                <option value="">Pilih Kamar</option>
                {rooms.map(r => <option key={r.id} value={r.id}>#{r.roomNumber} - {r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tanggal Masuk *</label>
              <input required type="date" className="input" value={form.checkInDate} onChange={e => setForm({...form, checkInDate: e.target.value})} />
            </div>
            {!tenant && (
              <div className="col-span-2">
                <label className="label">Password Akun (default: password123)</label>
                <input type="password" className="input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="password123" />
              </div>
            )}
            <div className="col-span-2">
              <label className="label">Alamat</label>
              <textarea className="input resize-none" rows={2} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
