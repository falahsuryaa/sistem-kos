import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, Eye, BedDouble, X, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  AVAILABLE: { label: 'Tersedia', class: 'badge-green' },
  OCCUPIED: { label: 'Terisi', class: 'badge-red' },
  MAINTENANCE: { label: 'Maintenance', class: 'badge-yellow' },
  INACTIVE: { label: 'Nonaktif', class: 'badge-gray' },
};

interface Room {
  id: string;
  roomNumber: string;
  name: string;
  floor: number;
  size: number;
  capacity: number;
  monthlyPrice: number;
  yearlyPrice: number;
  status: string;
  description: string;
  photos: string[];
  facilities: { facility: { id: string; name: string; icon: string } }[];
  tenants: { id: string; fullName: string }[];
}

interface RoomFormData {
  roomNumber: string;
  name: string;
  floor: string;
  size: string;
  capacity: string;
  monthlyPrice: string;
  yearlyPrice: string;
  status: string;
  description: string;
}

function RoomModal({ room, onClose, facilities }: { room?: Room; onClose: () => void; facilities: { id: string; name: string; icon: string }[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RoomFormData>({
    roomNumber: room?.roomNumber || '',
    name: room?.name || '',
    floor: String(room?.floor || 1),
    size: String(room?.size || ''),
    capacity: String(room?.capacity || 1),
    monthlyPrice: String(room?.monthlyPrice || ''),
    yearlyPrice: String(room?.yearlyPrice || ''),
    status: room?.status || 'AVAILABLE',
    description: room?.description || '',
  });
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(room?.facilities.map(f => f.facility.id) || []);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (room) return api.put(`/rooms/${room.id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      return api.post('/rooms', data, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(room ? 'Kamar berhasil diperbarui!' : 'Kamar berhasil ditambahkan!');
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message || 'Gagal menyimpan'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    selectedFacilities.forEach(fId => fd.append('facilityIds', fId));
    mutation.mutate(fd);
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilities(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{room ? 'Edit Kamar' : 'Tambah Kamar'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nomor Kamar *</label>
              <input required className="input" value={form.roomNumber} onChange={e => setForm({...form, roomNumber: e.target.value})} placeholder="101" />
            </div>
            <div>
              <label className="label">Nama Kamar *</label>
              <input required className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Kamar Standar 101" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Lantai</label>
              <input type="number" className="input" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} min="1" />
            </div>
            <div>
              <label className="label">Luas (m²)</label>
              <input type="number" className="input" value={form.size} onChange={e => setForm({...form, size: e.target.value})} placeholder="3.5" step="0.1" />
            </div>
            <div>
              <label className="label">Kapasitas</label>
              <input type="number" className="input" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} min="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Harga Bulanan (Rp) *</label>
              <input required type="number" className="input" value={form.monthlyPrice} onChange={e => setForm({...form, monthlyPrice: e.target.value})} placeholder="800000" />
            </div>
            <div>
              <label className="label">Harga Tahunan (Rp)</label>
              <input type="number" className="input" value={form.yearlyPrice} onChange={e => setForm({...form, yearlyPrice: e.target.value})} placeholder="8500000" />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="AVAILABLE">Tersedia</option>
              <option value="OCCUPIED">Terisi</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi singkat kamar..." />
          </div>
          {facilities.length > 0 && (
            <div>
              <label className="label">Fasilitas</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {facilities.map(f => (
                  <button key={f.id} type="button" onClick={() => toggleFacility(f.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${selectedFacilities.includes(f.id) ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-emerald-300'}`}
                  >
                    <span>{f.icon}</span> {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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

export default function AdminRooms() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | undefined>();
  const [viewRoom, setViewRoom] = useState<Room | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/rooms?${params}`);
      return data;
    },
  });

  const { data: facilitiesData } = useQuery({
    queryKey: ['facilities'],
    queryFn: async () => {
      const { data } = await api.get('/facilities');
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Kamar berhasil dihapus'); },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err?.response?.data?.message || 'Gagal menghapus'),
  });

  const handleDelete = (room: Room) => {
    if (confirm(`Hapus kamar ${room.roomNumber}? (akan dinonaktifkan)`)) deleteMutation.mutate(room.id);
  };

  const rooms: Room[] = data?.data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Kamar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} kamar terdaftar</p>
        </div>
        <button onClick={() => { setEditRoom(undefined); setShowModal(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Tambah Kamar
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari kamar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="AVAILABLE">Tersedia</option>
          <option value="OCCUPIED">Terisi</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); }} className="btn-secondary">
            <X className="w-4 h-4" /> Reset
          </button>
        )}
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="card p-12 text-center">
          <BedDouble className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada kamar terdaftar</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
            <Plus className="w-4 h-4" /> Tambah Kamar Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => {
            const s = STATUS_LABELS[room.status] || STATUS_LABELS.AVAILABLE;
            return (
              <div key={room.id} className="card overflow-hidden hover:shadow-card-hover transition-all duration-200 group">
                {/* Photo */}
                <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 relative overflow-hidden">
                  {room.photos && room.photos.length > 0 ? (
                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${room.photos[0]}`} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BedDouble className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`badge ${s.class}`}>{s.label}</span>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                    #{room.roomNumber}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{room.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span>Lantai {room.floor}</span>
                    <span>•</span>
                    <span>{room.size ? `${room.size}m²` : '-'}</span>
                    <span>•</span>
                    <span>Max {room.capacity} orang</span>
                  </div>

                  {/* Facilities */}
                  {room.facilities && room.facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {room.facilities.slice(0, 4).map(rf => (
                        <span key={rf.facility.id} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                          {rf.facility.icon} {rf.facility.name}
                        </span>
                      ))}
                      {room.facilities.length > 4 && <span className="text-xs text-slate-400">+{room.facilities.length - 4}</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{formatRupiah(Number(room.monthlyPrice))}</p>
                      <p className="text-xs text-slate-400">per bulan</p>
                    </div>
                    {room.tenants && room.tenants.length > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Penghuni</p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-24">{room.tenants[0].fullName}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => setViewRoom(room)} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                      <Eye className="w-3.5 h-3.5" /> Detail
                    </button>
                    <button onClick={() => { setEditRoom(room); setShowModal(true); }} className="btn-primary flex-1 justify-center text-xs py-1.5">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(room)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Modal */}
      {showModal && (
        <RoomModal
          room={editRoom}
          onClose={() => { setShowModal(false); setEditRoom(undefined); }}
          facilities={facilitiesData || []}
        />
      )}

      {/* View Room Detail Modal */}
      {viewRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setViewRoom(undefined)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-modal w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Detail Kamar #{viewRoom.roomNumber}</h2>
              <button onClick={() => setViewRoom(undefined)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {viewRoom.photos && viewRoom.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {viewRoom.photos.slice(0, 4).map((photo, idx) => (
                    <img key={idx} src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${photo}`} alt="" className="h-28 w-full object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-slate-400 text-xs">Nama</p><p className="font-medium text-slate-900 dark:text-white">{viewRoom.name}</p></div>
                <div><p className="text-slate-400 text-xs">Status</p><span className={`badge ${STATUS_LABELS[viewRoom.status]?.class}`}>{STATUS_LABELS[viewRoom.status]?.label}</span></div>
                <div><p className="text-slate-400 text-xs">Lantai</p><p className="font-medium text-slate-900 dark:text-white">{viewRoom.floor}</p></div>
                <div><p className="text-slate-400 text-xs">Luas</p><p className="font-medium text-slate-900 dark:text-white">{viewRoom.size ? `${viewRoom.size}m²` : '-'}</p></div>
                <div><p className="text-slate-400 text-xs">Harga/Bulan</p><p className="font-medium text-emerald-600">{formatRupiah(Number(viewRoom.monthlyPrice))}</p></div>
                <div><p className="text-slate-400 text-xs">Kapasitas</p><p className="font-medium text-slate-900 dark:text-white">{viewRoom.capacity} orang</p></div>
              </div>
              {viewRoom.description && <div><p className="text-slate-400 text-xs mb-1">Deskripsi</p><p className="text-sm text-slate-700 dark:text-slate-300">{viewRoom.description}</p></div>}
              {viewRoom.facilities && viewRoom.facilities.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs mb-2">Fasilitas</p>
                  <div className="flex flex-wrap gap-2">
                    {viewRoom.facilities.map(rf => (
                      <span key={rf.facility.id} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full">
                        {rf.facility.icon} {rf.facility.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
