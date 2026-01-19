'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Paperclip, Image as ImageIcon, FileText, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores';

interface Attachment {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

interface FileAttachmentProps {
  onFilesSelected: (attachments: Attachment[], caption?: string) => void;
}

export function FileAttachment({ onFilesSelected }: FileAttachmentProps) {
  const { token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File terlalu besar! Maksimum 10MB');
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview({ file, url });
    } else {
      setPreview({ file, url: '' });
    }
  };

  const handleUpload = async () => {
    if (!preview) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', preview.file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/upload/single`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data) {
        onFilesSelected([data.data], caption.trim() || undefined);
        handleClose();
      } else {
        alert('Gagal upload file: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Gagal upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
    setCaption('');
    setIsOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        onClick={() => setIsOpen(true)}
      >
        <Paperclip className="h-5 w-5 text-slate-500" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kirim File</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!preview ? (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <ImageIcon className="h-6 w-6 text-blue-500" />
                  <span className="text-sm">Gambar</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-20 flex-col gap-2"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <FileText className="h-6 w-6 text-orange-500" />
                  <span className="text-sm">Dokumen</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Preview */}
                {preview.url ? (
                  <div className="relative rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={preview.url}
                      alt="Preview"
                      className="w-full h-40 object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70"
                      onClick={() => {
                        URL.revokeObjectURL(preview.url);
                        setPreview(null);
                      }}
                    >
                      <X className="h-3 w-3 text-white" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-3">
                    <FileText className="h-8 w-8 text-orange-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{preview.file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(preview.file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setPreview(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {/* Caption input */}
                <Input
                  placeholder="Tambahkan keterangan... (opsional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isUploading) {
                      handleUpload();
                    }
                  }}
                />

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    Batal
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengunggah...
                      </>
                    ) : (
                      'Kirim'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
