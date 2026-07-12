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

  const rooms = roomsData?.data || [];

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
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-md">
              <Home className="w-4 h-4 text-white dark:text-slate-900" />
            </div>
            <span className="font-bold text-lg tracking-tight">Kos Cikawung</span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {[['Beranda', 'hero'], ['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Lokasi', 'location'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-yellow-400 dark:hover:bg-slate-800 transition-all">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/login" className="hidden md:flex btn-primary text-sm py-2">
              Masuk
            </Link>
            <button className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1 animate-slide-in">
            {[['Beranda', 'hero'], ['Kamar', 'rooms'], ['Fasilitas', 'facilities'], ['Lokasi', 'location'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                {label}
              </button>
            ))}
            <Link to="/login" className="block w-full text-center btn-primary mt-2">Masuk</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative overflow-hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 transition-colors duration-200">
        <div className="relative max-w-7xl mx-auto px-4 py-24 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800 rounded-full px-4 py-1.5 mb-6">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-700 dark:text-slate-300">Kos Modern, Nyaman & Terpercaya</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
            Temukan Kos Impian<br />di <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">Kos Cikawung</span>
          </h1>
          <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            Kamar kos nyaman dengan fasilitas lengkap, lokasi strategis, dan harga terjangkau. Nikmati pengalaman tinggal yang modern dan praktis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => scrollTo('rooms')} className="px-8 py-3.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold rounded-xl shadow-md hover:bg-slate-850 dark:hover:bg-slate-100 transition-all flex items-center gap-2">
              Lihat Kamar <ArrowRight className="w-4 h-4" />
            </button>
            <a href="https://wa.me/6289635584373" target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-white text-slate-900 dark:bg-slate-900 dark:text-white font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
              <Phone className="w-4 h-4" /> Hubungi Kami
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
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm">
                <s.icon className="w-5 h-5 text-slate-700 dark:text-slate-300 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.val}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tentang Kami</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Kenapa Memilih Kos Cikawung?</h2>
            <p className="text-slate-600 dark:text-slate-400">Kami berkomitmen menyediakan tempat tinggal yang nyaman, aman, dan modern untuk Anda.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🏠', title: 'Kamar Modern', desc: 'Desain kamar modern dan bersih dengan furnitur lengkap siap huni.' },
              { icon: '🔒', title: 'Keamanan 24 Jam', desc: 'Dilengkapi CCTV dan keamanan 24 jam untuk kenyamanan Anda.' },
              { icon: '💳', title: 'Pembayaran Online', desc: 'Bayar sewa bulanan dengan mudah melalui berbagai metode pembayaran digital.' },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow group">
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kamar</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Pilih Kamar Sesuai Kebutuhan</h2>
            <p className="text-slate-600 dark:text-slate-400">Temukan kamar yang sempurna untuk Anda dengan berbagai pilihan harga dan fasilitas.</p>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BedDouble className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada kamar tersedia saat ini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room: any) => (
                <div key={room.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all group">
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    {room.photos?.[0] ? (
                      <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${room.photos[0]}`} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <BedDouble className="w-16 h-16 text-slate-400/50" />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{room.name}</h3>
                      <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-350 px-2 py-0.5 rounded-full">#{room.roomNumber}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{room.description || `Kamar lantai ${room.floor}, kapasitas ${room.capacity} orang`}</p>
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {room.facilities?.map((rf: any) => (
                        <span key={rf.id} className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-400">
                          {rf.facility?.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">{formatRupiah(Number(room.monthlyPrice))}</p>
                        <p className="text-xs text-slate-500">/bulan</p>
                      </div>
                      <button
                        onClick={() => { setBookingData({ ...bookingData, roomId: room.id }); setShowBooking(true); setBookingSubmitted(false); }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        Booking <ArrowRight className="w-3.5 h-3.5" />
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
      <section id="facilities" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Fasilitas</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Fasilitas Lengkap</h2>
            <p className="text-slate-600 dark:text-slate-400">Semua yang Anda butuhkan sudah tersedia.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: Wifi, label: 'WiFi Gratis', desc: 'Internet cepat 24 jam' },
              { icon: Car, label: 'Parkir Luas', desc: 'Motor & mobil' },
              { icon: Bath, label: 'Kamar Mandi Dalam', desc: 'Privasi terjaga' },
              { icon: Home, label: 'Dapur Mini di Dalam', desc: 'Fasilitas masak personal' },
              { icon: Droplets, label: 'Sudah Termasuk Air', desc: 'Air bersih lancar' },
              { icon: ShieldCheck, label: 'Keamanan 24 Jam', desc: 'Lingkungan aman teratur' },
              { icon: Trash2, label: 'Kebersihan Sampah', desc: 'Lingkungan rapi dan bersih' },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 transition-colors">
                  <f.icon className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                </div>
                <h4 className="font-semibold text-sm mb-0.5">{f.label}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Testimoni</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Apa Kata Mereka?</h2>
          </div>
          <div className="flex justify-center">
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl bg-slate-50/50 dark:bg-slate-900/30">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="font-medium text-slate-700 dark:text-slate-300">Belum ada testimoni saat ini</p>
              <p className="text-xs text-slate-400 mt-1">Kolom kepuasan akan diisi langsung oleh penyewa kos melalui aplikasi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Lokasi</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Lokasi Strategis</h2>
            <p className="text-slate-600 dark:text-slate-400">Terletak di daerah Baleendah, dekat dengan berbagai fasilitas umum.</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15840.404285888252!2d107.6329!3d-6.9961!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e68c1d5abcbcdff%3A0xb695e1eb2c6fa5e9!2sBaleendah%2C%20Bandung%20Regency%2C%20West%20Java!5e0!3m2!1sid!2sid!4v1700000000000"
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              className="w-full grayscale dark:invert"
            />
          </div>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-start gap-2 max-w-lg"><MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" /> <span>Jalan Cikawung Sari no 9 RT03/10 desa warga mekar kecamatan Baleendah, KAB. BANDUNG, BALEENDAH, JAWA BARAT, ID, 40375</span></span>
            <span className="flex items-center gap-2 flex-shrink-0"><Phone className="w-4 h-4 text-slate-600 dark:text-slate-400" /> 0896-3558-4373</span>
            <span className="flex items-center gap-2 flex-shrink-0"><Mail className="w-4 h-4 text-slate-600 dark:text-slate-400" /> info@koscikawung.com</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">FAQ</span>
            <h2 className="text-3xl lg:text-4xl font-bold mt-2 mb-4">Pertanyaan Umum</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-slate-900 dark:bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Siap Bergabung?</h2>
          <p className="text-lg text-slate-300 mb-8">Hubungi kami sekarang dan temukan kamar kos impian Anda!</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://wa.me/6289635584373" target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-100 font-semibold rounded-xl shadow-lg transition-all flex items-center gap-2">
              <Phone className="w-4 h-4" /> Chat WhatsApp
            </a>
            <button onClick={() => scrollTo('rooms')} className="px-8 py-3.5 bg-slate-850 hover:bg-slate-800 text-white font-semibold rounded-xl border border-slate-700 transition-all">
              Lihat Kamar
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center border border-slate-800">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">Kos Cikawung</span>
              </div>
              <p className="text-sm">Kos modern, nyaman, dan terpercaya di Baleendah, Bandung.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Link</h4>
              <div className="space-y-2 text-sm">
                <button onClick={() => scrollTo('hero')} className="block hover:text-white transition-colors">Beranda</button>
                <button onClick={() => scrollTo('rooms')} className="block hover:text-white transition-colors">Kamar</button>
                <button onClick={() => scrollTo('faq')} className="block hover:text-white transition-colors">FAQ</button>
                <Link to="/login" className="block hover:text-white transition-colors">Login</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Kontak</h4>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />Jalan Cikawung Sari no 9 RT03/10 desa warga mekar kecamatan Baleendah, KAB. BANDUNG, BALEENDAH, JAWA BARAT, ID, 40375</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" /> 0896-3558-4373</p>
                <p className="flex items-center gap-2"><Mail className="w-4 h-4 flex-shrink-0" /> info@koscikawung.com</p>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-900 pt-6 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Kos Cikawung. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBooking(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Booking Kamar</h2>
              <button onClick={() => setShowBooking(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            {bookingSubmitted ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Booking Berhasil!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Terima kasih! Admin akan segera menghubungi Anda untuk konfirmasi.</p>
                <button onClick={() => setShowBooking(false)} className="btn-primary mx-auto">Tutup</button>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="p-5 space-y-4">
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
                    <label className="label">No. HP</label>
                    <input className="input" value={bookingData.phone} onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="label">NIK</label>
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
                  <label className="label">Catatan (opsional)</label>
                  <textarea className="input min-h-16" value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} placeholder="Ada yang ingin disampaikan?" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowBooking(false)} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary">Kirim Booking</button>
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
