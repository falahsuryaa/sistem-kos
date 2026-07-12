import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Loader2, Mail, Phone, MapPin, CreditCard, Calendar, QrCode, Star, Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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

  const qc = useQueryClient();

  const { data: myReview, isLoading: isReviewLoading } = useQuery({
    queryKey: ['my-review'],
    queryFn: async () => {
      const { data } = await api.get('/reviews/my');
      return data.data;
    },
  });

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    } else {
      setRating(0);
      setComment('');
    }
  }, [myReview]);

  const reviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      const { data } = await api.post('/reviews', payload);
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Ulasan berhasil disimpan!');
      qc.invalidateQueries({ queryKey: ['my-review'] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan ulasan');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/reviews/my');
      return data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Ulasan berhasil dihapus');
      qc.invalidateQueries({ queryKey: ['my-review'] });
      setRating(0);
      setComment('');
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus ulasan');
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

      {/* Testimonial / Review Section */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> Ulasan Kos Anda
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Berikan penilaian dan komentar Anda mengenai pengalaman tinggal di Kos Cikawung. Ulasan Anda akan ditampilkan di Landing Page utama.
        </p>

        {isReviewLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : myReview && !isEditing ? (
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= myReview.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Anda yakin ingin menghapus ulasan Anda?')) {
                      deleteReviewMutation.mutate();
                    }
                  }}
                  disabled={deleteReviewMutation.isPending}
                  className="text-xs text-rose-650 font-bold hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
              "{myReview.comment}"
            </p>
            <p className="text-[10px] text-slate-400 mt-2">
              Dibuat pada: {new Date(myReview.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (rating === 0) {
                toast.error('Silakan pilih rating bintang terlebih dahulu');
                return;
              }
              reviewMutation.mutate({ rating, comment });
            }}
            className="space-y-4"
          >
            <div>
              <label className="label">Rating Bintang</label>
              <div className="flex gap-1.5 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 rounded-lg focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-350 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Tulis Ulasan Anda</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input min-h-24 resize-none"
                placeholder="Bagikan pengalaman tinggal Anda, misalnya: tempat bersih, nyaman, pemilik ramah..."
                maxLength={400}
                required
              />
              <span className="text-[10px] text-slate-400 block text-right mt-1">
                Maksimal 400 karakter
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={reviewMutation.isPending}
                className="btn-primary py-2 px-4 text-sm font-semibold flex items-center gap-1.5"
              >
                {reviewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {myReview ? 'Simpan Perubahan' : 'Kirim Ulasan'}
              </button>
              {myReview && (
                <button
                  type="button"
                  onClick={() => {
                    setRating(myReview.rating);
                    setComment(myReview.comment);
                    setIsEditing(false);
                  }}
                  className="btn-secondary py-2 px-4 text-sm font-semibold"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        )}
      </div>

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
