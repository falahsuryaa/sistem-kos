import { useQuery } from '@tanstack/react-query';
import {
  BedDouble, Users, TrendingUp,
  AlertCircle, Percent, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, Home, CheckCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../lib/api';

const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;
const formatK = (val: number) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : val >= 1000 ? `${(val / 1000).toFixed(0)}rb` : val.toString();

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  prefix?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend, prefix }: StatCardProps) {
  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
        {prefix && <span className="text-sm font-normal text-slate-500 mr-0.5">{prefix}</span>}
        {value}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444'];

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['revenue-chart'],
    queryFn: async () => {
      const { data } = await api.get(`/dashboard/revenue-chart?year=${new Date().getFullYear()}`);
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: occupancy } = useQuery({
    queryKey: ['occupancy-chart'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/occupancy-chart');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: activities } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/recent-activity');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: roomsData } = useQuery({
    queryKey: ['dashboard-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/rooms?limit=10');
      return data.data;
    },
    refetchInterval: 5000,
  });

  const { data: pendingInvoices } = useQuery({
    queryKey: ['dashboard-pending-invoices'],
    queryFn: async () => {
      const { data } = await api.get('/invoices?status=PENDING&limit=5');
      return data.data;
    },
    refetchInterval: 5000,
  });

  if (statsLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Memuat data dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Ringkasan data Kos Ciparay hari ini</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Kamar" value={stats?.rooms?.total || 0} subtitle={`${stats?.rooms?.occupied || 0} terisi, ${stats?.rooms?.available || 0} kosong`} icon={BedDouble} color="bg-emerald-600" />
        <StatCard title="Total Penyewa" value={stats?.tenants?.total || 0} subtitle={`+${stats?.tenants?.newThisMonth || 0} bulan ini`} icon={Users} color="bg-violet-600" trend={stats?.tenants?.newThisMonth > 0 ? 5 : 0} />
        <StatCard title="Pendapatan Bulan Ini" value={formatK(stats?.revenue?.thisMonth || 0)} prefix="Rp" icon={TrendingUp} color="bg-emerald-600" trend={stats?.revenue?.growth} />
        <StatCard title="Tagihan Menunggu" value={stats?.invoices?.pending || 0} subtitle={`${stats?.invoices?.overdue || 0} terlambat`} icon={AlertCircle} color="bg-amber-500" />
      </div>

      {/* 3 Rooms Overview */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Status 3 Kamar Kos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['A', 'B', 'C'].map((code) => {
            const room = roomsData?.find((r: any) => r.roomNumber === code);
            const isOccupied = room?.status === 'OCCUPIED';
            const tenantName = room?.tenants?.[0]?.fullName || 'Kosong';
            
            return (
              <div key={code} className={`card p-5 border-l-4 ${isOccupied ? 'border-l-emerald-500' : 'border-l-emerald-500'} flex flex-col justify-between h-36`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">Kamar {code}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Lantai {room?.floor || 1} · {room?.size || 3.5} m²</p>
                  </div>
                  <span className={`badge ${isOccupied ? 'badge-emerald' : 'badge-green'}`}>
                    {isOccupied ? 'Terisi' : 'Tersedia'}
                  </span>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">Penghuni</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-36">
                      {tenantName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Harga</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{room ? formatRupiah(Number(room.monthlyPrice)) : 'Rp 800.000'}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard title="Tingkat Hunian" value={`${stats?.occupancyRate || 0}%`} icon={Percent} color="bg-cyan-600" />
        <StatCard title="Pendapatan Tahun Ini" value={formatK(stats?.revenue?.thisYear || 0)} prefix="Rp" icon={TrendingUp} color="bg-teal-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Grafik Pendapatan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tahun {new Date().getFullYear()}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart || []} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatK} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: any) => [formatRupiah(Number(v))]} contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#F1F5F9' }} />
              <Area type="monotone" dataKey="revenue" name="Pendapatan" stroke="#2563EB" strokeWidth={2} fill="url(#revenueGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Status Kamar</h3>
          {occupancy && occupancy.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={occupancy} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {occupancy.map((_: unknown, idx: number) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1E293B', border: 'none', borderRadius: '8px', color: '#F1F5F9' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {occupancy.map((item: { label: string; count: number }, idx: number) => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Tidak ada data</div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Recent Activity & Pending Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Aktivitas Terbaru</h3>
          {activities && activities.length > 0 ? (
            <div className="space-y-3">
              {activities.map((activity: { type: string; message: string; amount?: number; time: string; status?: string }, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0
                    ${activity.type === 'PAYMENT' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      activity.type === 'NEW_TENANT' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'}`}
                  >
                    {activity.type === 'PAYMENT' ? '💰' : activity.type === 'NEW_TENANT' ? '👤' : '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{activity.message}</p>
                    {activity.amount && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{formatRupiah(activity.amount)}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(activity.time).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Home className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada aktivitas terbaru</p>
            </div>
          )}
        </div>

        {/* Pending Invoices List */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Tagihan Menunggu</h3>
            <span className="badge badge-yellow">{pendingInvoices?.length || 0} pending</span>
          </div>
          {pendingInvoices && pendingInvoices.length > 0 ? (
            <div className="space-y-3">
              {pendingInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kamar #{inv.room?.roomNumber} · {inv.tenant?.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Jatuh tempo: {new Date(inv.dueDate).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(inv.totalAmount))}</p>
                    <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                      Menunggu
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50 text-emerald-500" />
              <p className="text-sm">Semua tagihan sudah lunas!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
