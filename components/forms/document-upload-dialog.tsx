'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileText, CircleCheck as CheckCircle2, Circle as XCircle, Trash2, File, Image, FileSpreadsheet, X } from 'lucide-react';

interface QueuedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  documentType: string;
  clientId: string;
}

const DOCUMENT_TYPES = ['Application', 'Policy', 'ID Card', 'Claim Form', 'Driver License', 'Title', 'Other'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
];

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return Image;
  if (mime.includes('spreadsheet') || mime.includes('csv') || mime.includes('excel')) return FileSpreadsheet;
  return FileText;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function guessDocumentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('application') || lower.includes('app')) return 'Application';
  if (lower.includes('policy') || lower.includes('dec') || lower.includes('declaration')) return 'Policy';
  if (lower.includes('id card') || lower.includes('id_card') || lower.includes('insurance card')) return 'ID Card';
  if (lower.includes('claim')) return 'Claim Form';
  if (lower.includes('license') || lower.includes('dl') || lower.includes('driver')) return 'Driver License';
  if (lower.includes('title')) return 'Title';
  return 'Other';
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  onComplete,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  clients: { id: string; first_name: string; last_name: string }[];
}) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [defaultClientId, setDefaultClientId] = useState('');
  const [defaultDocType, setDefaultDocType] = useState('Other');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFiles([]);
    setDefaultClientId('');
    setDefaultDocType('Other');
    setIsDragging(false);
    setIsUploading(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: QueuedFile[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: exceeds 20MB limit`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.csv')) {
        errors.push(`${file.name}: unsupported file type`);
        return;
      }

      validFiles.push({
        file,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        status: 'pending',
        progress: 0,
        documentType: guessDocumentType(file.name),
        clientId: defaultClientId,
      });
    });

    if (errors.length > 0) {
      toast.error(`${errors.length} file(s) rejected: ${errors[0]}`);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  }, [defaultClientId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<QueuedFile>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    const filesWithoutClient = pendingFiles.filter((f) => !f.clientId);
    if (filesWithoutClient.length > 0) {
      toast.error('All files need a client assigned');
      return;
    }

    setIsUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      toast.error('You must be logged in');
      setIsUploading(false);
      return;
    }

    let successCount = 0;

    for (const qf of pendingFiles) {
      updateFile(qf.id, { status: 'uploading', progress: 10 });

      const ext = qf.file.name.split('.').pop() || 'bin';
      const storagePath = `${userId}/${Date.now()}-${qf.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, qf.file);

      if (uploadError) {
        updateFile(qf.id, { status: 'error', error: uploadError.message });
        continue;
      }

      updateFile(qf.id, { progress: 60 });

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase.from('documents').insert({
        client_id: qf.clientId,
        document_type: qf.documentType,
        file_name: qf.file.name,
        file_path: urlData.publicUrl,
        file_size: qf.file.size,
        mime_type: qf.file.type,
        uploaded_by: userId,
      });

      if (dbError) {
        updateFile(qf.id, { status: 'error', error: dbError.message });
        continue;
      }

      updateFile(qf.id, { status: 'done', progress: 100 });
      successCount++;
    }

    setIsUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} document${successCount !== 1 ? 's' : ''} uploaded`);
      onComplete();
    }
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#2C3E6B]" />
            Upload Documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Client</Label>
              <Select
                value={defaultClientId || 'none'}
                onValueChange={(v) => {
                  const clientId = v === 'none' ? '' : v;
                  setDefaultClientId(clientId);
                  setFiles((prev) => prev.map((f) => f.status === 'pending' ? { ...f, clientId: f.clientId || clientId } : f));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default Document Type</Label>
              <Select
                value={defaultDocType}
                onValueChange={(v) => {
                  setDefaultDocType(v);
                  setFiles((prev) => prev.map((f) => f.status === 'pending' ? { ...f, documentType: v } : f));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              isDragging ? 'border-[#2C3E6B] bg-blue-50/50' : 'border-gray-200 hover:border-[#2C3E6B]/50 hover:bg-muted/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-[#2C3E6B]' : 'text-muted-foreground/50'}`} />
            <p className="font-medium text-sm">
              {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, images, Word, Excel, CSV -- up to 20MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>

          {files.length > 0 && (
            <ScrollArea className="flex-1 border rounded-lg" style={{ maxHeight: '280px' }}>
              <div className="divide-y">
                {files.map((qf) => {
                  const Icon = getFileIcon(qf.file.type);
                  return (
                    <div key={qf.id} className="flex items-center gap-3 p-3">
                      <div className={`rounded-lg p-2 shrink-0 ${
                        qf.status === 'done' ? 'bg-emerald-50' :
                        qf.status === 'error' ? 'bg-red-50' :
                        'bg-muted/50'
                      }`}>
                        {qf.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : qf.status === 'error' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium truncate max-w-[180px]">{qf.file.name}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatSize(qf.file.size)}</span>
                        </div>

                        {qf.status === 'uploading' && (
                          <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-[#2C3E6B] transition-all rounded-full" style={{ width: `${qf.progress}%` }} />
                          </div>
                        )}
                        {qf.status === 'error' && (
                          <p className="text-[10px] text-red-600">{qf.error}</p>
                        )}

                        {qf.status === 'pending' && (
                          <div className="flex gap-2">
                            <Select
                              value={qf.clientId || 'none'}
                              onValueChange={(v) => updateFile(qf.id, { clientId: v === 'none' ? '' : v })}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-[140px]">
                                <SelectValue placeholder="Client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Select client</SelectItem>
                                {clients.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={qf.documentType}
                              onValueChange={(v) => updateFile(qf.id, { documentType: v })}
                            >
                              <SelectTrigger className="h-7 text-[10px] w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {qf.status === 'done' && (
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{qf.documentType}</Badge>
                        )}
                      </div>

                      {qf.status === 'pending' && (
                        <button
                          onClick={() => removeFile(qf.id)}
                          className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-muted-foreground">
              {files.length > 0 && (
                <>
                  {pendingCount > 0 && `${pendingCount} ready`}
                  {doneCount > 0 && `${pendingCount > 0 ? ' / ' : ''}${doneCount} uploaded`}
                </>
              )}
            </div>
            <div className="flex gap-2">
              {allDone ? (
                <Button onClick={() => handleClose(false)} className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20">
                  Done
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                  <Button
                    onClick={handleUpload}
                    disabled={pendingCount === 0 || isUploading}
                    className="bg-gradient-to-r from-[#2C3E6B] to-[#1B2A4A] hover:from-[#1B2A4A] hover:to-[#2C3E6B] text-white border border-[#B8962E]/20"
                  >
                    {isUploading ? (
                      <>
                        <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-4 w-4" />
                        Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
