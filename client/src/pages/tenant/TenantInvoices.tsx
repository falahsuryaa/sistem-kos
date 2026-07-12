import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Loader2, Clock, CheckCircle, AlertTriangle, XCircle, CreditCard, Eye, X
} from 'lucide-react';
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

export default function TenantInvoices() {
  const qc = useQueryClient();
  const [uploadModalInvoiceId, setUploadModalInvoiceId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/invoices/my');
      return data;
    },
    refetchInterval: 5000,
  });

  const payMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await api.post('/payments/create', { invoiceId });
      return data;
    },
    onSuccess: (res) => {
      const { snapToken, isDemo, snapRedirectUrl } = res.data;
      if (isDemo) {
        toast.success('Demo Mode: Pembayaran berhasil disimulasikan!');
        qc.invalidateQueries({ queryKey: ['tenant-invoices'] });
        return;
      }
      // Open Midtrans Snap
      if (window.snap && snapToken) {
        window.snap.pay(snapToken, {
          onSuccess: () => {
            toast.success('Pembayaran berhasil!');
            qc.invalidateQueries({ queryKey: ['tenant-invoices'] });
          },
          onPending: () => toast('Menunggu pembayaran...', { icon: '⏳' }),
          onError: () => toast.error('Pembayaran gagal'),
          onClose: () => toast('Pembayaran dibatalkan', { icon: '❌' }),
        });
      } else if (snapRedirectUrl) {
        window.open(snapRedirectUrl, '_blank');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat pembayaran');
    },
  });

  const uploadProofMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('paymentProof', file);
      const { data } = await api.post(`/invoices/${id}/upload-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Bukti pembayaran berhasil diunggah!');
      qc.invalidateQueries({ queryKey: ['tenant-invoices'] });
      setUploadModalInvoiceId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah bukti pembayaran');
    },
  });

  const invoices = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tagihan Saya</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{invoices.length} tagihan</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : invoices.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada tagihan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => {
            const st = STATUS_MAP[inv.status] || STATUS_MAP.PENDING;
            const StIcon = st.icon;
            const canPay = inv.status === 'PENDING' || inv.status === 'OVERDUE';
            return (
              <div key={inv.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{inv.invoiceNumber}</span>
                      <span className={`badge ${st.cls}`}>
                        <StIcon className="w-3 h-3 mr-1" />
                        {st.label}
                      </span>
                      {inv.paymentProof && inv.status === 'PENDING' && (
                        <span className="badge bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-semibold py-0.5 px-2 rounded-full">
                          Menunggu Konfirmasi Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Periode: <span className="font-medium">{inv.periodMonth}/{inv.periodYear}</span>
                      {' · '}Kamar <span className="font-medium">#{inv.room?.roomNumber || '-'}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Jatuh tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {Number(inv.lateFee) > 0 && (
                      <p className="text-xs text-red-500 mt-0.5">Denda keterlambatan: {formatRupiah(Number(inv.lateFee))}</p>
                    )}
                    {inv.paymentProof && (
                      <div className="mt-2 text-xs">
                        <a
                          href={inv.paymentProof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Bukti Terkirim
                        </a>
                      </div>
                    )}
                    {inv.status === 'PAID' && (
                      <div className="mt-2 text-xs">
                        <a
                          href={`${import.meta.env.VITE_API_URL}/invoices/${inv.id}/pdf?token=${localStorage.getItem('accessToken')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1.5"
                        >
                          📄 Cetak Nota Pembayaran
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(inv.totalAmount))}</p>
                    </div>
                    {canPay && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => payMutation.mutate(inv.id)}
                          disabled={payMutation.isPending}
                          className="btn-primary whitespace-nowrap text-xs py-2 px-3 sm:text-sm"
                        >
                          {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                          Bayar Online
                        </button>
                        <button
                          onClick={() => setUploadModalInvoiceId(inv.id)}
                          className="btn-secondary whitespace-nowrap text-xs py-2 px-3 sm:text-sm"
                        >
                          Upload Bukti
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Proof Modal */}
      {uploadModalInvoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setUploadModalInvoiceId(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Bukti Pembayaran</h2>
              <button onClick={() => setUploadModalInvoiceId(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const fileInput = (e.currentTarget.elements.namedItem('proofFile') as HTMLInputElement);
              const file = fileInput.files?.[0];
              if (!file) { toast.error('Pilih file terlebih dahulu'); return; }
              uploadProofMutation.mutate({ id: uploadModalInvoiceId, file });
            }} className="p-5 space-y-4">
              <div>
                <label className="label">Pilih Gambar Bukti Transfer (Maks 5MB)</label>
                <input
                  type="file"
                  name="proofFile"
                  accept="image/*"
                  className="input py-2"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setUploadModalInvoiceId(null)} className="btn-secondary">Batal</button>
                <button type="submit" disabled={uploadProofMutation.isPending} className="btn-primary">
                  {uploadProofMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Unggah Bukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Extend window for Midtrans Snap
declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: () => void;
        onPending?: () => void;
        onError?: () => void;
        onClose?: () => void;
      }) => void;
    };
  }
}
