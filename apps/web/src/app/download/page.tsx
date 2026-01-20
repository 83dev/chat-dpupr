'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Monitor } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-8 animate-bounce">
        <Smartphone className="w-10 h-10" />
      </div>

      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
        Segera Hadir!
      </h1>
      
      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mb-8">
        Aplikasi Chat DPUPR Banten sedang dalam pengembangan untuk platform Desktop, Android, dan iOS.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 w-full max-w-lg">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-50">
          <Monitor className="w-6 h-6 mx-auto mb-2 text-slate-400" />
          <span className="text-sm font-medium text-slate-500">Desktop</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-50">
          <Smartphone className="w-6 h-6 mx-auto mb-2 text-slate-400" />
          <span className="text-sm font-medium text-slate-500">Android</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-50">
          <Smartphone className="w-6 h-6 mx-auto mb-2 text-slate-400" />
          <span className="text-sm font-medium text-slate-500">iOS</span>
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
