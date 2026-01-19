'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Shield, MapPin, Users } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSSOLogin = () => {
    setIsLoading(true);
    window.location.href = `${BACKEND_URL}/auth/login/sso`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyek0zNiAxNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
      
      <div className="relative w-full max-w-lg">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/30 mb-4">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Chat DPUPR Banten</h1>
          <p className="text-slate-400">Sistem Komunikasi Internal</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 bg-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-white">Selamat Datang</CardTitle>
            <CardDescription className="text-slate-300">
              Masuk menggunakan akun SSO DPUPR Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleSSOLogin}
              disabled={isLoading}
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menghubungkan...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  Masuk dengan SSO DPUPR
                </div>
              )}
            </Button>

            {/* Features */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <MessageSquare className="w-6 h-6 mx-auto text-blue-400 mb-2" />
                <p className="text-xs text-slate-300">Real-time Chat</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <MapPin className="w-6 h-6 mx-auto text-cyan-400 mb-2" />
                <p className="text-xs text-slate-300">Lokasi Proyek</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <Users className="w-6 h-6 mx-auto text-teal-400 mb-2" />
                <p className="text-xs text-slate-300">Tim Bidang</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          © 2026 DPUPR Provinsi Banten
        </p>
      </div>
    </div>
  );
}
