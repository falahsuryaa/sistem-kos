import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
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

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('limit', '50');
      const { data } = await api.get(`/payments?${params}`);
      return data;
    },
  });

  const payments = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Riwayat Pembayaran</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{data?.meta?.total || 0} transaksi</p>
        </div>
      </div>

      <div className="card p-4 flex gap-3">
        <select className="input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="SETTLEMENT">Berhasil</option>
          <option value="PENDING">Menunggu</option>
          <option value="CANCEL">Dibatalkan</option>
          <option value="EXPIRE">Kadaluarsa</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500">Belum ada pembayaran</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Order ID</th><th>Penyewa</th><th>Invoice</th><th>Nominal</th><th>Metode</th><th>Status</th><th>Tanggal</th></tr></thead>
            <tbody>
              {payments.map((p: any) => {
                const st = STATUS_MAP[p.status] || STATUS_MAP.PENDING;
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.orderId}</td>
                    <td className="font-medium">{p.invoice?.tenant?.fullName || '-'}</td>
                    <td className="text-xs font-mono">{p.invoice?.invoiceNumber || '-'}</td>
                    <td className="font-semibold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(p.amount))}</td>
                    <td className="text-sm">{p.paymentType || '-'}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="text-sm">{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
