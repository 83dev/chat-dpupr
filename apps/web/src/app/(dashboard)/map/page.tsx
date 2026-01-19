'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchAPI, formatMessageTime, getInitials } from '@/lib/utils';
import type { ApiResponse, Message } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, MessageSquare, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Dynamic import for Leaflet (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),  
  { ssr: false }
);

interface ReportWithRoom extends Message {
  room?: {
    id: string;
    nama: string;
    proyekNama?: string | null;
  };
  sender: {
    nip: string;
    nama: string;
    avatar?: string | null;
    bidang?: { nama: string } | null;
  };
}

function MapContent() {
  const searchParams = useSearchParams();
  const roomFilter = searchParams.get('room');
  
  const [reports, setReports] = useState<ReportWithRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportWithRoom | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    fetchAPI<ApiResponse<ReportWithRoom[]>>('/api/chat/reports')
      .then(response => {
        if (response.success && response.data) {
          const filtered = roomFilter 
            ? response.data.filter(r => r.roomId === roomFilter)
            : response.data;
          setReports(filtered);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [roomFilter]);

  // Calculate center
  const center = useMemo(() => {
    if (reports.length === 0) {
      return { lat: -6.1200, lng: 106.1500 }; // Default: Banten
    }
    
    const validReports = reports.filter(r => r.locationData?.lat && r.locationData?.lng);
    if (validReports.length === 0) {
      return { lat: -6.1200, lng: 106.1500 };
    }
    
    const sum = validReports.reduce(
      (acc, r) => ({
        lat: acc.lat + (r.locationData?.lat || 0),
        lng: acc.lng + (r.locationData?.lng || 0),
      }),
      { lat: 0, lng: 0 }
    );
    
    return {
      lat: sum.lat / validReports.length,
      lng: sum.lng / validReports.length,
    };
  }, [reports]);

  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="flex-1 bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="w-80 p-4 border-l space-y-4 hidden lg:block">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Map */}
      <div className="flex-1 relative min-h-[300px] lg:min-h-0">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-[1000] p-4 bg-gradient-to-b from-black/30 to-transparent">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="secondary" size="icon" className="rounded-full shadow-lg">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="font-semibold text-white drop-shadow-lg">Peta Laporan Proyek</h1>
          </div>
        </div>

        {isClient && (
          <MapContainer
            center={[center.lat, center.lng]}
            zoom={10}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {reports.filter(r => r.locationData).map(report => (
              <Marker
                key={report.id}
                position={[report.locationData!.lat, report.locationData!.lng]}
                eventHandlers={{
                  click: () => setSelectedReport(report),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="font-semibold">{report.sender.nama}</p>
                    <p className="text-sm text-gray-600 mt-1">{report.body}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatMessageTime(report.createdAt)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Sidebar */}
      <div className="h-64 lg:h-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="hidden lg:flex items-center gap-3 h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h2 className="font-semibold text-slate-900 dark:text-white">Laporan Proyek</h2>
          <Badge variant="secondary" className="ml-auto">
            {reports.length}
          </Badge>
        </div>

        <ScrollArea className="h-[calc(100%-64px)] lg:h-[calc(100%-64px)]">
          <div className="p-3 space-y-2">
            {reports.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Belum ada laporan
                </p>
              </div>
            ) : (
              reports.map(report => (
                <Card 
                  key={report.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedReport?.id === report.id 
                      ? 'ring-2 ring-blue-500' 
                      : ''
                  }`}
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-slate-100 text-sm">
                          {getInitials(report.sender.nama)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 dark:text-white">
                          {report.sender.nama}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {report.body}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {formatMessageTime(report.createdAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}
