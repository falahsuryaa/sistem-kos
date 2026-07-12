import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import api from '../../lib/api';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Menunggu', cls: 'badge-yellow' },
  SETTLEMENT: { label: 'Berhasil', cls: 'badge-green' },
  CANCEL: { label: 'Dibatalkan', cls: 'badge-gray' },
  DENY: { label: 'Ditolak', cls: 'badge-red' },
  EXPIRE: { label: 'Kadaluarsa', cls: 'badge-gray' },
  FAILURE: { label: 'Gagal', cls: 'badge-red' },
};

export default function TenantPayments() {
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-payments'],
    queryFn: async () => {
      const { data } = await api.get('/payments/my');
      return data;
    },
  });

  const payments = data?.data || [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Riwayat Pembayaran</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{payments.length} transaksi</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Belum ada riwayat pembayaran</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING;
            return (
              <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    p.status === 'SETTLEMENT' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                    p.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-slate-100 dark:bg-slate-700'
                  }`}>
                    {p.status === 'SETTLEMENT' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> :
                     p.status === 'PENDING' ? <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /> :
                     <XCircle className="w-5 h-5 text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.orderId}</span>
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Invoice: {p.invoice?.invoiceNumber || '-'}
                      {' · '}Periode: {p.invoice?.periodMonth}/{p.invoice?.periodYear}
                    </p>
                    {p.paymentType && (
                      <p className="text-xs text-slate-500 mt-0.5">Metode: {p.paymentType}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(p.createdAt).toLocaleString('id-ID')}</p>
                    {p.status === 'SETTLEMENT' && p.invoice && (
                      <div className="mt-2 text-xs">
                        <a
                          href={`${import.meta.env.VITE_API_URL}/invoices/${p.invoice.id}/pdf?token=${localStorage.getItem('accessToken')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1.5"
                        >
                          📄 Cetak Nota Pembayaran
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${p.status === 'SETTLEMENT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatRupiah(Number(p.amount))}
                    </p>
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
