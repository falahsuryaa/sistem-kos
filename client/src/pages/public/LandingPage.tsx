import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, BedDouble, Wifi, Bath, Car, ShieldCheck,
  ChevronDown, ChevronUp, MapPin, Phone, Mail, Star,
  ArrowRight, Menu, X, Moon, Sun, Users, CheckCircle, Clock,
  Droplets, Trash2
} from 'lucide-react';
import api from '../../lib/api';

const formatRupiah = (val: number) => `Rp ${Number(val).toLocaleString('id-ID')}`;

const FAQS = [
  { q: 'Bagaimana cara booking kamar?', a: 'Anda bisa booking kamar melalui form booking di website ini. Pilih kamar yang tersedia, isi data diri, dan admin akan menghubungi Anda untuk konfirmasi.' },
  { q: 'Apa saja metode pembayaran yang tersedia?', a: 'Kami menyediakan berbagai metode pembayaran melalui Midtrans: QRIS, GoPay, ShopeePay, Dana, Transfer Bank, Virtual Account, dan Kartu Kredit.' },
  { q: 'Bagaimana jika ada kerusakan di kamar?', a: 'Anda bisa melaporkan keluhan melalui sistem keluhan di dashboard penyewa. Admin akan segera menindaklanjuti laporan Anda.' },
  { q: 'Apakah bisa membawa teman menginap?', a: 'Tamu diperbolehkan berkunjung hingga pukul 22.00 WIB. Untuk menginap, harap konfirmasi terlebih dahulu ke pengelola.' },
];

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingData, setBookingData] = useState({ roomId: '', fullName: '', email: '', phone: '', nik: '', checkInDate: '', duration: '1', notes: '' });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const { data: roomsData } = useQuery({
    queryKey: ['public-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/rooms?status=AVAILABLE');
      return data;
    },
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['public-reviews'],
    queryFn: async () => {
      const { data } = await api.get('/reviews');
      return data;
    },
  });

  const rooms = roomsData?.data || [];
  const reviews = reviewsData?.data || [];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/bookings', {
        ...bookingData,
        duration: parseInt(bookingData.duration),
      });
      setBookingSubmitted(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mengirim booking');
    }
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">Kos Cikawung</span>
          </div>

          <div className="hidden md:flex items-center gap-7">
            {[['Beranda', 'hero'], ['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Ulasan', 'testimonials'], ['Lokasi', 'location'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-yellow-400 dark:hover:bg-slate-900 transition-all">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/login" className="hidden md:flex btn-primary text-sm font-semibold px-5 py-2.5 shadow-sm">
              Masuk
            </Link>
            <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1 animate-slide-in">
            {[['Beranda', 'hero'], ['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Ulasan', 'testimonials'], ['Lokasi', 'location'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900">
                {label}
              </button>
            ))}
            <Link to="/login" className="block w-full text-center btn-primary mt-2 py-2.5">Masuk</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-900 py-20 lg:py-28 transition-colors duration-200">
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54 48c-2 0-3 1-4 2v4c0 1-1 2-2 2h-4c-1 0-2-1-2-2v-4c-1-1-2-2-4-2h-4c-1 0-2 1-2 2v4c0 1-1 2-2 2H4c-1 0-2-1-2-2v-4c0-1-1-2-2-2h-2c-1 0-2 1-2 2v4c0 1 1 2 2 2h10c1 0 2-1 2-2v-4c0-1 1-2 2-2h4c1 0 2 1 2 2v4c0 1 1 2 2 2h10c1 0 2-1 2-2v-4c0-1 1-2 2-2h4c1 0 2 1 2 2v4c0 1 1 2 2 2h4c1 0 2-1 2-2v-4c0-1 1-2 2-2z\' fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-full px-4 py-1.5 mb-6 border border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Kos Modern, Nyaman & Terpercaya</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
            Temukan Kamar Kos Impian<br />di <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-355">Kos Cikawung</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-700 dark:text-slate-300 max-w-2xl mx-auto mb-8 font-medium leading-relaxed">
            Kamar kos nyaman dengan fasilitas lengkap, lokasi strategis di Baleendah, dan harga terjangkau. Nikmati pengalaman tinggal yang modern, praktis, dan aman.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => scrollTo('rooms')} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
              Lihat Kamar <ArrowRight className="w-5 h-5" />
            </button>
            <a href="https://wa.me/6289635584373" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-800 dark:bg-slate-900 dark:text-white font-bold rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-5 h-5 text-emerald-600" /> Hubungi Kami
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { icon: BedDouble, val: '3', label: 'Kamar Tersedia' },
              { icon: Users, val: '50', label: 'Penghuni Puas' },
              { icon: Star, val: '4.8', label: 'Rating' },
              { icon: Clock, val: '24/7', label: 'Keamanan' },
            ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-[1.02]">
                <s.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{s.val}</p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Tentang Kami</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Kenapa Memilih Kos Cikawung?</h2>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Kami berkomitmen menyediakan tempat tinggal yang nyaman, aman, dan modern untuk kenyamanan optimal Anda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🏠', title: 'Kamar Modern', desc: 'Desain kamar modern dan bersih dengan furnitur lengkap siap huni.' },
              { icon: '🔒', title: 'Keamanan 24 Jam', desc: 'Dilengkapi CCTV dan keamanan 24 jam untuk kenyamanan dan ketenangan Anda.' },
              { icon: '💳', title: 'Pembayaran Online', desc: 'Bayar sewa bulanan dengan mudah melalui berbagai metode pembayaran digital digital.' },
            ].map((item, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-7 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow group">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="py-20 bg-slate-50 dark:bg-slate-900/30 border-t border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Kamar</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Pilih Kamar Sesuai Kebutuhan</h2>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Temukan kamar yang sempurna untuk Anda dengan berbagai pilihan harga dan fasilitas terbaik.</p>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
              <BedDouble className="w-14 h-14 mx-auto mb-4 text-slate-400 opacity-60" />
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">Belum ada kamar tersedia saat ini</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Silakan hubungi admin kami untuk informasi ketersediaan kamar terbaru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rooms.map((room: any) => (
                <div key={room.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all group shadow-sm">
                  <div className="h-52 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center relative">
                    {room.photos?.[0] ? (
                      <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${room.photos[0]}`} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <BedDouble className="w-20 h-20 text-slate-300 dark:text-slate-700" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-xl text-slate-900 dark:text-white">{room.name}</h3>
                      <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100/50 dark:border-emerald-900/30">Lantai {room.floor} - #{room.roomNumber}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-2 leading-relaxed font-medium">{room.description || `Kamar lantai ${room.floor}, kapasitas ${room.capacity} orang`}</p>
                    <div className="flex items-center gap-2 mb-5 flex-wrap">
                      {room.facilities?.map((rf: any) => (
                        <span key={rf.id} className="text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/50 dark:border-slate-700/50">
                          {rf.facility?.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupiah(Number(room.monthlyPrice))}</p>
                        <p className="text-xs font-bold text-slate-500">/ bulan</p>
                      </div>
                      <button
                        onClick={() => { setBookingData({ ...bookingData, roomId: room.id }); setShowBooking(true); setBookingSubmitted(false); }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm text-sm"
                      >
                        Booking <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Facilities Section */}
      <section id="facilities" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Fasilitas</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Fasilitas Lengkap</h2>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Semua kenyamanan yang Anda butuhkan sudah tersedia dan termasuk di dalam sewa.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { icon: Wifi, label: 'WiFi Gratis', desc: 'Akses internet cepat 24 jam sepuasnya.' },
              { icon: Car, label: 'Parkir Luas', desc: 'Area parkir aman untuk kendaraan motor & mobil.' },
              { icon: Bath, label: 'Kamar Mandi Dalam', desc: 'Kamar mandi bersih di dalam kamar untuk privasi.' },
              { icon: Home, label: 'Dapur Mini di Dalam', desc: 'Dilengkapi area dapur kecil pribadi di setiap kamar.' },
              { icon: Droplets, label: 'Sudah Termasuk Air', desc: 'Biaya sewa bulanan sudah gratis pemakaian air bersih.' },
              { icon: ShieldCheck, label: 'Keamanan 24 Jam', desc: 'Keamanan ekstra terjaga siang dan malam.' },
              { icon: Trash2, label: 'Kebersihan Sampah', desc: 'Pengelolaan sampah teratur, lingkungan bersih bebas bau.' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-850 transition-colors group shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">{f.label}</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/30 border-t border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Testimoni</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Apa Kata Mereka?</h2>
          </div>
          <div className="flex justify-center">
            <div className="text-center py-14 px-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl w-full max-w-2xl bg-white dark:bg-slate-900 shadow-sm">
              <Star className="w-12 h-12 mx-auto mb-4 text-emerald-500 fill-emerald-500" />
              <p className="text-xl font-bold text-slate-900 dark:text-white">Belum ada testimoni saat ini</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 font-medium leading-relaxed max-w-md mx-auto">
                Kolom kepuasan dan ulasan akan diisi secara otomatis langsung oleh penyewa kos melalui form kepuasan di aplikasi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Lokasi</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Lokasi Strategis</h2>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Terletak di daerah Baleendah, dekat dengan berbagai fasilitas umum, perkantoran, dan tempat belanja.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm p-3">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15840.404285888252!2d107.6329!3d-6.9961!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68c1d5abcbcdff%3A0xb695e1eb2c6fa5e9!2sBaleendah%2C%20Bandung%20Regency%2C%20West%20Java!5e0!3m2!1sid!2sid!4v1700000000000"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              className="w-full rounded-2xl transition-all"
            />
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-800 dark:text-slate-200">
            <div className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Alamat Lengkap</h4>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">Jalan Cikawung Sari no 9 RT03/10 desa warga mekar kecamatan Baleendah, KAB. BANDUNG, BALEENDAH, JAWA BARAT, ID, 40375</p>
              </div>
            </div>
            <div className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Phone className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Hubungi Kami</h4>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">0896-3558-4373</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">WhatsApp Fast Response</p>
              </div>
            </div>
            <div className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Mail className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-1">Kirim Email</h4>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">info@koscikawung.com</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Tanggapan dalam 24 jam</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      {reviews.length > 0 && (
        <section id="testimonials" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-14">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Testimoni</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Ulasan Dari Penghuni</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-semibold">
                Dengarkan langsung ulasan dan pengalaman tinggal dari para penghuni Kos Cikawung yang telah terverifikasi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((r: any) => (
                <div key={r.id} className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all hover:scale-[1.01]">
                  <div>
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-350 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-slate-750 dark:text-slate-300 italic font-semibold leading-relaxed mb-6">
                      "{r.comment}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/50 dark:border-slate-800">
                    {r.tenant?.photo ? (
                      <img
                        src={r.tenant.photo.startsWith('http') ? r.tenant.photo : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${r.tenant.photo}`}
                        alt={r.tenant.fullName}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                        {r.tenant?.fullName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{r.tenant?.fullName}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Penghuni {r.tenant?.room?.name || 'Kamar'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-900/30 border-t border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-14">
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">FAQ</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mt-2 mb-4">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all hover:border-slate-350 dark:hover:border-slate-800">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-800 dark:text-slate-100"
                >
                  <span className="text-base pr-4 leading-relaxed">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 animate-fade-in border-t border-slate-100/50 dark:border-slate-800 pt-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4">Siap Bergabung Bersama Kami?</h2>
          <p className="text-lg text-slate-300 mb-8 font-semibold">Hubungi kami sekarang untuk konfirmasi pemesanan dan temukan kamar kos impian Anda di Baleendah!</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://wa.me/6289635584373" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" /> Chat WhatsApp Sekarang
            </a>
            <button onClick={() => scrollTo('rooms')} className="w-full sm:w-auto px-8 py-4 bg-slate-850 hover:bg-slate-800 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center">
              Lihat Ketersediaan Kamar
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900 text-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white tracking-tight">Kos Cikawung</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed font-semibold">Kos modern, nyaman, bersih, dan berfasilitas lengkap serta berlokasi strategis di Baleendah, Bandung.</p>
            </div>
            <div>
              <h4 className="font-bold text-white text-base mb-4 tracking-wide">Navigasi Link</h4>
              <div className="space-y-3 font-semibold text-slate-400">
                <button onClick={() => scrollTo('hero')} className="block hover:text-white transition-colors">Beranda Utama</button>
                <button onClick={() => scrollTo('rooms')} className="block hover:text-white transition-colors">Daftar Kamar</button>
                <button onClick={() => scrollTo('testimonials')} className="block hover:text-white transition-colors">Ulasan Penghuni</button>
                <button onClick={() => scrollTo('faq')} className="block hover:text-white transition-colors">FAQ Pertanyaan</button>
                <Link to="/login" className="block hover:text-white transition-colors">Halaman Login</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white text-base mb-4 tracking-wide">Hubungi Kontak</h4>
              <div className="space-y-3 font-semibold text-slate-400">
                <p className="flex items-start gap-2 leading-relaxed"><MapPin className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />Jalan Cikawung Sari no 9 RT03/10 desa warga mekar kecamatan Baleendah, KAB. BANDUNG, BALEENDAH, JAWA BARAT, ID, 40375</p>
                <p className="flex items-center gap-2"><Phone className="w-5 h-5 text-emerald-500 flex-shrink-0" /> 0896-3558-4373</p>
                <p className="flex items-center gap-2"><Mail className="w-5 h-5 text-emerald-500 flex-shrink-0" /> info@koscikawung.com</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-8 text-center text-slate-500 font-semibold">
            <p>&copy; {new Date().getFullYear()} Kos Cikawung. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBooking(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md mx-4 animate-scale-in max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Booking Kamar</h2>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            {bookingSubmitted ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Booking Berhasil!</h3>
                <p className="text-sm text-slate-700 dark:text-slate-350 mb-4 font-semibold">Terima kasih! Pemesanan Anda telah terdaftar. Admin akan segera menghubungi Anda untuk konfirmasi.</p>
                <button onClick={() => setShowBooking(false)} className="btn-primary mx-auto font-bold px-6 py-2.5">Tutup</button>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="p-6 space-y-4 font-semibold">
                <div>
                  <label className="label">Nama Lengkap</label>
                  <input className="input" value={bookingData.fullName} onChange={(e) => setBookingData({ ...bookingData, fullName: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={bookingData.email} onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">No. HP / WA</label>
                    <input className="input" value={bookingData.phone} onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">NIK (Nomor Induk Kependudukan)</label>
                  <input className="input" value={bookingData.nik} onChange={(e) => setBookingData({ ...bookingData, nik: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tanggal Check-in</label>
                    <input type="date" className="input" value={bookingData.checkInDate} onChange={(e) => setBookingData({ ...bookingData, checkInDate: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Durasi (bulan)</label>
                    <input type="number" min="1" className="input" value={bookingData.duration} onChange={(e) => setBookingData({ ...bookingData, duration: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">Catatan Tambahan (opsional)</label>
                  <textarea className="input min-h-16 text-xs" value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} placeholder="Tulis catatan jika ada..." />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={() => setShowBooking(false)} className="btn-secondary font-bold">Batal</button>
                  <button type="submit" className="btn-primary font-bold">Kirim Booking</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/6289635584373"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        title="Chat WhatsApp"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
