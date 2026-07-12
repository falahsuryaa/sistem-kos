import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Loader2, Clock, CheckCircle, AlertTriangle, XCircle, CreditCard
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
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{inv.invoiceNumber}</span>
                      <span className={`badge ${st.cls}`}>
                        <StIcon className="w-3 h-3 mr-1" />
                        {st.label}
                      </span>
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
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(inv.totalAmount))}</p>
                    </div>
                    {canPay && (
                      <button
                        onClick={() => payMutation.mutate(inv.id)}
                        disabled={payMutation.isPending}
                        className="btn-primary whitespace-nowrap"
                      >
                        {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Bayar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
