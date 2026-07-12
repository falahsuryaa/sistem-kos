import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Search, Loader2, RefreshCw, CheckCircle, Clock, AlertTriangle, XCircle, Plus, X, Eye } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;
const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING: { label: 'Menunggu', cls: 'badge-yellow', icon: Clock },
  PAID: { label: 'Lunas', cls: 'badge-green', icon: CheckCircle },
  OVERDUE: { label: 'Terlambat', cls: 'badge-red', icon: AlertTriangle },
  EXPIRED: { label: 'Kadaluarsa', cls: 'badge-gray', icon: XCircle },
  CANCELLED: { label: 'Dibatalkan', cls: 'badge-gray', icon: XCircle },
};

export default function AdminInvoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  
  // Form State
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/invoices?${params}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-active'],
    queryFn: async () => {
      const { data } = await api.get('/rooms?limit=50');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/invoices/generate-monthly'),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success(res.data.message); },
    onError: () => toast.error('Gagal generate invoice'),
  });

  const createInvoiceMutation = useMutation({
    mutationFn: (payload: any) => api.post('/invoices', payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(res.data.message || 'Invoice berhasil dibuat');
      setShowCreateModal(false);
      // Reset Form
      setSelectedRoomId('');
      setDueDate('');
      setAmount('');
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat invoice');
    },
  });

  const payManualMutation = useMutation({
    mutationFn: (id: string) => api.put(`/invoices/${id}`, { status: 'PAID' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Tagihan berhasil ditandai lunas!');
    },
    onError: () => {
      toast.error('Gagal memperbarui status tagihan');
    },
  });

  const invoices = data?.data || [];
  const filtered = search ? invoices.filter((i: any) =>
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.tenant?.fullName?.toLowerCase().includes(search.toLowerCase())
  ) : invoices;

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRoom = roomsData?.find((r: any) => r.id === selectedRoomId);
    const tenantId = selectedRoom?.tenants?.[0]?.id;
    if (!tenantId) {
      toast.error('Kamar yang dipilih tidak memiliki penghuni aktif');
      return;
    }
    createInvoiceMutation.mutate({
      tenantId,
      roomId: selectedRoomId,
      periodMonth,
      periodYear,
      amount: Number(amount),
      dueDate,
      notes,
    });
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const selectedRoom = roomsData?.find((r: any) => r.id === roomId);
    if (selectedRoom) {
      setAmount(String(selectedRoom.monthlyPrice));
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tagihan & Invoice</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} invoice</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="btn-secondary">
            <Plus className="w-4 h-4" /> Buat Tagihan
          </button>
          <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="btn-primary">
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Generate Bulanan
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Cari invoice..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="PAID">Lunas</option>
          <option value="OVERDUE">Terlambat</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Tidak ada invoice</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
             <thead>
              <tr><th>No. Invoice</th><th>Penyewa</th><th>Kamar</th><th>Periode</th><th>Nominal</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((inv: any) => {
                const st = STATUS_MAP[inv.status] || STATUS_MAP.PENDING;
                const StIcon = st.icon;
                return (
                  <tr key={inv.id}>
                    <td className="font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                    <td className="font-medium">{inv.tenant?.fullName || '-'}</td>
                    <td><span className="badge-emerald">#{inv.room?.roomNumber || '-'}</span></td>
                    <td className="text-sm">{inv.periodMonth}/{inv.periodYear}</td>
                    <td className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(inv.totalAmount))}</td>
                    <td className="text-sm">{new Date(inv.dueDate).toLocaleDateString('id-ID')}</td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={`badge ${st.cls}`}><StIcon className="w-3 h-3 mr-1" />{st.label}</span>
                        {inv.paymentProof && inv.status === 'PENDING' && (
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 mt-0.5"
                          >
                            <Eye className="w-2.5 h-2.5" /> Ada Bukti Bayar
                          </button>
                        )}
                        {inv.paymentProof && inv.status === 'PAID' && (
                          <button
                            onClick={() => setViewingInvoice(inv)}
                            className="text-[10px] text-slate-500 hover:underline flex items-center gap-0.5 mt-0.5"
                          >
                            <Eye className="w-2.5 h-2.5" /> Lihat Bukti
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => payManualMutation.mutate(inv.id)}
                            className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                            title="Tandai Lunas"
                          >
                            Tandai Lunas
                          </button>
                        )}
                        {inv.status === 'PAID' && (
                          <a
                            href={`${import.meta.env.VITE_API_URL}/invoices/${inv.id}/pdf?token=${localStorage.getItem('accessToken')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 text-xs font-semibold rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                          >
                            📄 Nota
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Manual Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Buat Tagihan Manual</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              <div>
                <label className="label">Pilih Kamar</label>
                <select className="input" value={selectedRoomId} onChange={(e) => handleRoomChange(e.target.value)} required>
                  <option value="">Pilih Kamar...</option>
                  {roomsData?.map((room: any) => (
                    <option key={room.id} value={room.id}>
                      Kamar {room.roomNumber} ({room.tenants?.[0]?.fullName || 'Kosong'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Bulan Periode</label>
                  <select className="input" value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Tahun Periode</label>
                  <input type="number" className="input" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} required />
                </div>
              </div>
              <div>
                <label className="label">Nominal Tagihan (Rp)</label>
                <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="800000" required />
              </div>
              <div>
                <label className="label">Tanggal Jatuh Tempo</label>
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
              <div>
                <label className="label">Catatan (opsional)</label>
                <textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tambahkan keterangan..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={createInvoiceMutation.isPending} className="btn-primary">
                  {createInvoiceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Proof Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setViewingInvoice(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg mx-4 animate-scale-in border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Detail Bukti Pembayaran #{viewingInvoice.invoiceNumber}</h3>
              <button onClick={() => setViewingInvoice(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 mb-4 text-sm text-slate-600 dark:text-slate-350">
              <p>Penyewa: <span className="font-semibold text-slate-900 dark:text-white">{viewingInvoice.tenant?.fullName}</span></p>
              <p>Nominal: <span className="font-semibold text-emerald-600 dark:text-emerald-450">{formatRupiah(Number(viewingInvoice.totalAmount))}</span></p>
            </div>
            <div className="max-h-[50vh] overflow-auto bg-slate-50 dark:bg-slate-900 rounded-2xl p-2 flex items-center justify-center border border-slate-200 dark:border-slate-800">
              <img src={viewingInvoice.paymentProof} alt="Bukti Pembayaran" className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-sm" />
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setViewingInvoice(null)} className="btn-secondary">Tutup</button>
              {viewingInvoice.status !== 'PAID' && (
                <button
                  onClick={() => {
                    payManualMutation.mutate(viewingInvoice.id);
                    setViewingInvoice(null);
                  }}
                  disabled={payManualMutation.isPending}
                  className="btn-primary"
                >
                  {payManualMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Konfirmasi Lunas
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
