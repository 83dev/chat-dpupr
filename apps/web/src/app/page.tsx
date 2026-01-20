'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageSquare, Shield, Zap, ArrowRight, Github, Link as LinkIcon, Monitor, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/stores';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && user) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Prevent flash of content while checking auth
  if (!mounted || isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 dark:text-white hidden sm:inline-block">
              Chat DPUPR
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Fitur</a>
            <a href="#about" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tentang</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button>
                Masuk
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-8 ring-1 ring-inset ring-blue-600/20">
            <span className="flex w-2 h-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
            Versi Internal 1.0
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
            Komunikasi Efektif untuk <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              Pembangunan Banten
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Platform komunikasi terpadu untuk Dinas Pekerjaan Umum dan Penataan Ruang Provinsi Banten. 
            Koordinasi proyek, diskusi bidang, dan laporan lapangan dalam satu aplikasi.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25">
                Mulai Sekarang
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8">
              Pelajari Lebih Lanjut
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Fitur Unggulan</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Didesain khusus untuk kebutuhan koordinasi internal DPUPR Banten.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Real-time Chat</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Komunikasi instan antar pegawai dan bidang. Mendukung pesan teks, gambar, dan dokumen proyek.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/50 rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6">
                <LinkIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Terintegrasi SSO</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Masuk dengan mudah menggunakan akun SSO DPUPR. Data pegawai tersinkronisasi otomatis.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Aman & Privat</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Server internal menjamin keamanan data dan percakapan dinas yang sensitif.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-3xl p-8 md:p-16 text-center text-white overflow-hidden relative">
            {/* Decorative Background Circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Akses Dimana Saja, Kapan Saja
              </h2>
              <p className="text-blue-100 text-lg mb-10 leading-relaxed">
                Tetap terhubung dengan tim proyek Anda melalui aplikasi desktop dan mobile kami. 
                Dapatkan notifikasi real-time dan akses dokumen lapangan dalam genggaman.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/download">
                  <Button size="lg" className="h-14 px-8 bg-white text-blue-600 hover:bg-blue-50 border-0">
                    <Monitor className="w-5 h-5 mr-2" />
                    Download Desktop
                  </Button>
                </Link>
                <Link href="/download">
                  <Button size="lg" variant="outline" className="h-14 px-8 border-white text-white hover:bg-white/10 hover:text-white bg-transparent">
                    <Smartphone className="w-5 h-5 mr-2" />
                    Android & iOS
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">
                Chat DPUPR
              </span>
            </div>
            
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center md:text-right">
              <p>© 2026 Dinas Pekerjaan Umum dan Penataan Ruang</p>
              <p>Provinsi Banten</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
