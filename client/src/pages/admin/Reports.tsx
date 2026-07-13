import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2, FileText, FileSpreadsheet,
  TrendingUp, TrendingDown, DollarSign, AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;
const formatK = (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : val >= 1000 ? `${(val / 1000).toFixed(0)}rb` : val.toString();

const currentYear = new Date().getFullYear();
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function AdminReports() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | ''>('');
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('yearly');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', year],
    queryFn: async () => {
      const { data } = await api.get(`/reports/summary?year=${year}`);
      return data.data;
    },
  });

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportType, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({ type: reportType, year: String(year) });
      if (reportType === 'monthly' && month) params.set('month', String(month));
      const { data } = await api.get(`/reports?${params}`);
      return data.data;
    },
  });

  const exportPDF = () => {
    const params = new URLSearchParams({ year: String(year) });
    if (month) params.set('month', String(month));
    const token = localStorage.getItem('accessToken');
    window.open(`${import.meta.env.VITE_API_URL}/reports/export/pdf?${params}&token=${token}`, '_blank');
  };

  const exportExcel = async () => {
    try {
      const params = new URLSearchParams({ year: String(year) });
      if (month) params.set('month', String(month));
      const response = await api.get(`/reports/export/excel?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a'); a.href = url; a.download = `laporan-${year}${month ? '-' + month : ''}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success('Laporan Excel berhasil diunduh');
    } catch { toast.error('Gagal mengunduh laporan'); }
  };

  const isLoading = summaryLoading || reportLoading;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Ringkasan keuangan kos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="btn-secondary">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={exportExcel} className="btn-primary">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select className="input w-32" value={reportType} onChange={(e) => setReportType(e.target.value as 'monthly' | 'yearly')}>
          <option value="yearly">Tahunan</option>
          <option value="monthly">Bulanan</option>
        </select>
        <select className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {reportType === 'monthly' && (
          <select className="input w-40" value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Pilih Bulan</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
                <span className="text-sm font-normal text-slate-500 mr-0.5">Rp</span>
                {formatK(report?.summary?.totalRevenue || 0)}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Pendapatan</p>
              <p className="text-xs text-slate-400 mt-1">{report?.summary?.paidCount || 0} invoice lunas</p>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
                <span className="text-sm font-normal text-slate-500 mr-0.5">Rp</span>
                {formatK(report?.summary?.totalExpenses || 0)}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Pengeluaran</p>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className={`text-2xl font-bold mb-0.5 ${(report?.summary?.netProfit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                <span className="text-sm font-normal text-slate-500 mr-0.5">Rp</span>
                {formatK(report?.summary?.netProfit || 0)}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Laba Bersih</p>
            </div>
            <div className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">{report?.summary?.pendingInvoices || 0}</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tagihan Tertunda</p>
            </div>
          </div>

          {/* Chart */}
          {summary?.monthly && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Grafik Pendapatan vs Pengeluaran</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tahun {year}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summary.monthly} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => [formatRupiah(Number(v))]} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#F1F5F9' }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Pendapatan" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Laba" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Details Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue detail */}
            <div className="card">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Pendapatan
                </h3>
              </div>
              {report?.invoices?.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {report.invoices.slice(0, 10).map((inv: any) => (
                    <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{inv.tenant?.fullName}</p>
                        <p className="text-xs text-slate-500">Kamar {inv.room?.roomNumber} — {inv.invoiceNumber}</p>
                      </div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">{formatRupiah(Number(inv.totalAmount))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">Tidak ada data</div>
              )}
            </div>

            {/* Expense detail */}
            <div className="card">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Pengeluaran
                </h3>
              </div>
              {report?.expenses?.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {report.expenses.slice(0, 10).map((exp: any) => (
                    <div key={exp.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{exp.title}</p>
                        <p className="text-xs text-slate-500">{exp.category} — {new Date(exp.date).toLocaleDateString('id-ID')}</p>
                      </div>
                      <span className="font-semibold text-red-500 text-sm">{formatRupiah(Number(exp.amount))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-sm">Tidak ada data</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
