'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { fetchAPI } from '@/lib/utils';
import type { ApiResponse, User } from '@/lib/types';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Store token and fetch user profile
      localStorage.setItem('token', token);
      
      fetchAPI<ApiResponse<User>>('/auth/me')
        .then((response) => {
          if (response.success && response.data) {
            setAuth(token, response.data);
            router.replace('/');
          } else {
            throw new Error('Failed to get user profile');
          }
        })
        .catch((error) => {
          console.error('Auth callback error:', error);
          localStorage.removeItem('token');
          router.replace('/auth/login');
        });
    } else {
      router.replace('/auth/login');
    }
  }, [searchParams, router, setAuth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Memproses login...</p>
        <p className="text-slate-400 text-sm mt-2">Mohon tunggu sebentar</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
