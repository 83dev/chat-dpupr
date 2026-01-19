'use client';

import { useChatStore } from '@/stores';
import { MessageSquare, MapPin, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardHome() {
  const { rooms } = useChatStore();

  // Count room types
  const bidangRooms = rooms.filter(r => r.type === 'BIDANG').length;
  const proyekRooms = rooms.filter(r => r.type === 'PROYEK').length;
  const privateRooms = rooms.filter(r => r.type === 'PRIVATE').length;

  return (
    <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg mb-6">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Selamat Datang!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Pilih percakapan dari sidebar untuk mulai chat
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <Building2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{bidangRooms}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Bidang</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <MapPin className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{proyekRooms}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Proyek</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <MessageSquare className="w-6 h-6 text-teal-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{privateRooms}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Private</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/map">
            <Button variant="outline" className="w-full sm:w-auto">
              <MapPin className="w-4 h-4 mr-2" />
              Lihat Peta Laporan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
