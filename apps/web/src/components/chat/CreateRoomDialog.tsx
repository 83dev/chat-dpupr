'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI, getInitials } from '@/lib/utils';
import { useChatStore, useAuthStore } from '@/stores';
import type { ApiResponse, ChatRoom, UserBasic } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FolderOpen, User, Search, Loader2 } from 'lucide-react';

interface CreateRoomDialogProps {
  type: 'PROYEK' | 'PRIVATE';
  trigger?: React.ReactNode;
}

interface UserSearchResult {
  nip: string;
  nama: string;
  avatar?: string | null;
  bidang?: { nama: string } | null;
  jabatan?: { nama: string } | null;
}

export function CreateRoomDialog({ type, trigger }: CreateRoomDialogProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setRooms, rooms } = useChatStore();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Project room fields
  const [nama, setNama] = useState('');
  const [description, setDescription] = useState('');
  const [proyekKode, setProyekKode] = useState('');
  const [memberNips, setMemberNips] = useState('');
  
  // Private chat fields
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Search users for private chat
  useEffect(() => {
    if (type !== 'PRIVATE' || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetchAPI<ApiResponse<UserSearchResult[]>>(
          `/api/chat/users/search?q=${encodeURIComponent(searchQuery)}`
        );
        if (response.success && response.data) {
          // Filter out current user
          setSearchResults(response.data.filter(u => u.nip !== user?.nip));
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, type, user?.nip]);

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) return;

    setIsLoading(true);

    try {
      const payload = {
        nama: nama.trim(),
        description: description.trim() || undefined,
        type: 'PROYEK',
        proyekKode: proyekKode.trim() || undefined,
        proyekNama: nama.trim(),
        memberNips: memberNips.split(',').map(nip => nip.trim()).filter(Boolean),
      };

      const response = await fetchAPI<ApiResponse<ChatRoom>>('/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success && response.data) {
        setRooms([response.data, ...rooms]);
        router.push(`/chat/${response.data.id}`);
        handleClose();
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPrivateChat = async () => {
    if (!selectedUser) return;

    setIsLoading(true);

    try {
      const payload = {
        nama: `Chat dengan ${selectedUser.nama}`,
        type: 'PRIVATE',
        memberNips: [selectedUser.nip],
      };

      const response = await fetchAPI<ApiResponse<ChatRoom>>('/api/chat/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.success && response.data) {
        setRooms([response.data, ...rooms]);
        router.push(`/chat/${response.data.id}`);
        handleClose();
      }
    } catch (error) {
      console.error('Failed to create private chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNama('');
    setDescription('');
    setProyekKode('');
    setMemberNips('');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUser(null);
  };

  const isProyek = type === 'PROYEK';

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            {isProyek ? <FolderOpen className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {isProyek ? 'Buat Grup Proyek' : 'Private Chat'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isProyek ? (
          // PROJECT ROOM FORM
          <form onSubmit={handleSubmitProject}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Buat Grup Proyek
              </DialogTitle>
              <DialogDescription>
                Buat grup untuk koordinasi proyek
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nama Proyek</label>
                <Input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Proyek Jalan Serang"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Kode Proyek (opsional)</label>
                <Input
                  value={proyekKode}
                  onChange={(e) => setProyekKode(e.target.value)}
                  placeholder="Contoh: PRJ-001"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Deskripsi (opsional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">
                  Tambah Anggota (NIP, pisahkan dengan koma)
                </label>
                <Input
                  value={memberNips}
                  onChange={(e) => setMemberNips(e.target.value)}
                  placeholder="199001012020121001, 199002022020121002"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Batal
              </Button>
              <Button type="submit" disabled={isLoading || !nama.trim()}>
                {isLoading ? 'Membuat...' : 'Buat'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // PRIVATE CHAT UI
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Mulai Private Chat
              </DialogTitle>
              <DialogDescription>
                Cari dan pilih rekan untuk memulai chat
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                  }}
                  placeholder="Ketik nama atau NIP..."
                  className="pl-9"
                />
              </div>

              {/* Selected user */}
              {selectedUser && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(selectedUser.nama)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-blue-700 dark:text-blue-300">{selectedUser.nama}</p>
                      <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{selectedUser.bidang?.nama}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                      className="text-blue-600"
                    >
                      Ganti
                    </Button>
                  </div>
                </div>
              )}

              {/* Search results */}
              {!selectedUser && searchQuery.length >= 2 && (
                <ScrollArea className="h-48 mt-4">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-500">
                      Tidak ditemukan
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map(u => (
                        <button
                          key={u.nip}
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-sm">
                              {getInitials(u.nama)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{u.nama}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {u.bidang?.nama || 'Staff'} • {u.nip}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}

              {!selectedUser && searchQuery.length < 2 && (
                <p className="text-center py-8 text-sm text-slate-400">
                  Ketik minimal 2 karakter untuk mencari
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Batal
              </Button>
              <Button 
                onClick={handleStartPrivateChat}
                disabled={isLoading || !selectedUser}
              >
                {isLoading ? 'Memulai...' : 'Mulai Chat'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
