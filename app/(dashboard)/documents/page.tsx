'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { formatDate } from '@/lib/format';
import type { Document } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FolderOpen, FileText, Download, Filter } from 'lucide-react';

const typeColors: Record<string, string> = {
  Application: 'bg-blue-100 text-blue-700',
  Policy: 'bg-emerald-100 text-emerald-700',
  'ID Card': 'bg-amber-100 text-amber-700',
  'Claim Form': 'bg-red-100 text-red-700',
  'Driver License': 'bg-cyan-100 text-cyan-700',
  Title: 'bg-gray-100 text-gray-700',
  Other: 'bg-gray-100 text-gray-700',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<(Document & { client?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadDocuments = useCallback(async () => {
    let query = supabase
      .from('documents')
      .select('*, client:clients(id, first_name, last_name)')
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') query = query.eq('document_type', typeFilter);

    const { data } = await query.limit(100);
    let filtered = data || [];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((d: any) =>
        d.file_name?.toLowerCase().includes(q) ||
        d.client?.first_name?.toLowerCase().includes(q) ||
        d.client?.last_name?.toLowerCase().includes(q)
      );
    }
    setDocuments(filtered);
    setLoading(false);
  }, [search, typeFilter]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">{documents.length} documents</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {['Application', 'Policy', 'ID Card', 'Claim Form', 'Driver License', 'Title', 'Other'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded bg-muted" />)}</div>
      ) : documents.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" /><p className="text-lg font-medium">No documents found</p><p className="text-sm text-muted-foreground mt-1">Upload documents from client profiles</p></CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[200px]">{doc.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.client && (
                        <Link href={`/clients/${doc.client_id}`} className="text-[#1E40AF] hover:underline">
                          {doc.client.first_name} {doc.client.last_name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell><Badge className={`${typeColors[doc.document_type] || typeColors.Other} text-[10px]`}>{doc.document_type || 'Other'}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(doc.created_at.split('T')[0])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
