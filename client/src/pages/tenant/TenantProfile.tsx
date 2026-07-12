import { useQuery } from '@tanstack/react-query';
import {
  User, Loader2, Mail, Phone, MapPin, CreditCard, Calendar, QrCode
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
    </div>
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-900 dark:text-white">{value || '-'}</p>
    </div>
  </div>
);

export default function TenantProfile() {
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: async () => {
      const { data } = await api.get('/tenants/me');
      return data.data;
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profil Saya</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Informasi data diri Anda</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {profile?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile?.fullName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kamar #{profile?.room?.roomNumber || '-'} — {profile?.room?.name || 'Tidak ada kamar'}
            </p>
            <span className={`badge mt-1 ${profile?.isActive ? 'badge-green' : 'badge-red'}`}>
              {profile?.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-700">
          <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-700">
            <InfoRow icon={CreditCard} label="NIK" value={profile?.nik} />
            <InfoRow icon={Mail} label="Email" value={profile?.email} />
            <InfoRow icon={Phone} label="No. HP" value={profile?.phone} />
            <InfoRow icon={User} label="Jenis Kelamin" value={
              profile?.gender === 'MALE' ? 'Laki-laki' : profile?.gender === 'FEMALE' ? 'Perempuan' : profile?.gender
            } />
          </div>
          <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-700">
            <InfoRow icon={Calendar} label="Tanggal Lahir" value={
              profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null
            } />
            <InfoRow icon={MapPin} label="Alamat" value={profile?.address} />
            <InfoRow icon={Calendar} label="Tanggal Masuk" value={
              profile?.checkInDate ? new Date(profile.checkInDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null
            } />
            <InfoRow icon={User} label="Kontak Darurat" value={
              profile?.emergencyContact ? `${profile.emergencyContact} (${profile.emergencyPhone || '-'})` : null
            } />
          </div>
        </div>
      </div>

      {/* QR Code */}
      {profile?.id && (
        <div className="card p-6 text-center">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-500" /> QR Code Penghuni
          </h3>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
              `${window.location.origin}/verify-tenant/${profile.id}`
            )}`}
            alt="QR Code"
            className="mx-auto w-48 h-48 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Gunakan QR code ini untuk identifikasi dan check-in</p>
        </div>
      )}

      {/* Room Details */}
      {profile?.room && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Detail Kamar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nomor Kamar</p>
              <p className="font-medium text-slate-900 dark:text-white">#{profile.room.roomNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Nama</p>
              <p className="font-medium text-slate-900 dark:text-white">{profile.room.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lantai</p>
              <p className="font-medium text-slate-900 dark:text-white">{profile.room.floor}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Harga/Bulan</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">Rp {Number(profile.room.monthlyPrice).toLocaleString('id-ID')}</p>
            </div>
            {profile.room.size && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Luas</p>
                <p className="font-medium text-slate-900 dark:text-white">{profile.room.size} m²</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
              <span className="badge-green">{profile.room.status === 'OCCUPIED' ? 'Terisi' : profile.room.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {profile?.notes && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Catatan</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{profile.notes}</p>
        </div>
      )}

      {/* Account Info */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Akun</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.email}</p>
              <p className="text-xs text-slate-500">Email akun</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
