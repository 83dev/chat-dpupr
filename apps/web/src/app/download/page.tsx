'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Monitor, Download, Apple, ExternalLink } from 'lucide-react';

// Download URLs - update these when new versions are released
const DOWNLOAD_URLS = {
  android: 'https://expo.dev/artifacts/eas/uVL7v2tvGGvJZBPt3XuZCu.apk',
  desktop: 'https://github.com/83dev/chat-dpupr/releases/download/v1.0.0/Chat-DPUPR-Setup-1.0.0.exe',
  ios: null, // Coming soon
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-8">
        <Download className="w-10 h-10" />
      </div>

      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
        Download Aplikasi
      </h1>
      
      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mb-8">
        Pilih platform yang sesuai dengan perangkat Anda untuk mengunduh aplikasi Chat DPUPR Banten.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 w-full max-w-2xl">
        {/* Desktop */}
        <a 
          href={DOWNLOAD_URLS.desktop}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <Monitor className="w-10 h-10 mx-auto mb-3 text-blue-600 group-hover:scale-110 transition-transform" />
          <span className="block text-lg font-semibold text-slate-900 dark:text-white mb-1">Desktop</span>
          <span className="text-xs text-slate-500 mb-3 block">Windows 10/11</span>
          <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Download .exe
          </Button>
        </a>
        
        {/* Android */}
        <a 
          href={DOWNLOAD_URLS.android}
          target="_blank"
          rel="noopener noreferrer"
          className="group p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-green-500 hover:shadow-lg transition-all"
        >
          <Smartphone className="w-10 h-10 mx-auto mb-3 text-green-600 group-hover:scale-110 transition-transform" />
          <span className="block text-lg font-semibold text-slate-900 dark:text-white mb-1">Android</span>
          <span className="text-xs text-slate-500 mb-3 block">Android 8.0+</span>
          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Download .apk
          </Button>
        </a>
        
        {/* iOS - Coming Soon */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60">
          <Apple className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <span className="block text-lg font-semibold text-slate-900 dark:text-white mb-1">iOS</span>
          <span className="text-xs text-slate-500 mb-3 block">iPhone & iPad</span>
          <Button size="sm" className="w-full" disabled>
            Segera Hadir
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-w-lg mb-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>📌 Desktop (Windows):</strong> Klik kanan pada file installer → <strong>"Run as administrator"</strong> untuk menjalankan instalasi.
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>📱 Android:</strong> Aktifkan "Install dari sumber tidak dikenal" di Pengaturan → Keamanan sebelum menginstall APK.
          </p>
        </div>
      </div>

      <Link href="/">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  );
}
