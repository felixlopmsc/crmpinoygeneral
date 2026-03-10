'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Download, X } from 'lucide-react';

interface ParsedClient {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  phone_2: string;
  date_of_birth: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  status: string;
  source: string;
  notes: string;
}

interface ImportRow {
  data: ParsedClient;
  errors: string[];
  rowNumber: number;
}

const VALID_STATUSES = ['Lead', 'Active', 'Inactive', 'Archived'];
const VALID_SOURCES = ['', 'Referral', 'Web', 'Walk-in', 'Phone', 'Facebook', 'Google Ads', 'Other'];

const COLUMN_MAP: Record<string, keyof ParsedClient> = {
  'first_name': 'first_name',
  'first name': 'first_name',
  'firstname': 'first_name',
  'last_name': 'last_name',
  'last name': 'last_name',
  'lastname': 'last_name',
  'email': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone number': 'phone',
  'phone_1': 'phone',
  'phone 1': 'phone',
  'primary phone': 'phone',
  'phone_2': 'phone_2',
  'phone 2': 'phone_2',
  'secondary phone': 'phone_2',
  'alt phone': 'phone_2',
  'date_of_birth': 'date_of_birth',
  'date of birth': 'date_of_birth',
  'dob': 'date_of_birth',
  'birthday': 'date_of_birth',
  'birth date': 'date_of_birth',
  'address_street': 'address_street',
  'address': 'address_street',
  'street': 'address_street',
  'street address': 'address_street',
  'address_city': 'address_city',
  'city': 'address_city',
  'address_state': 'address_state',
  'state': 'address_state',
  'address_zip': 'address_zip',
  'zip': 'address_zip',
  'zip code': 'address_zip',
  'zipcode': 'address_zip',
  'postal code': 'address_zip',
  'status': 'status',
  'source': 'source',
  'lead source': 'source',
  'notes': 'notes',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function validateRow(data: ParsedClient, rowNumber: number): string[] {
  const errors: string[] = [];
  if (!data.first_name) errors.push('First name is required');
  if (!data.last_name) errors.push('Last name is required');
  if (!data.email) errors.push('Email is required');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Invalid email format');
  if (data.status && !VALID_STATUSES.includes(data.status)) errors.push(`Invalid status: ${data.status}`);
  if (data.source && !VALID_SOURCES.includes(data.source)) errors.push(`Invalid source: ${data.source}`);
  return errors;
}

function parseCSV(content: string): { rows: ImportRow[]; headers: string[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], headers: [] };

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());
  const columnMapping: (keyof ParsedClient | null)[] = headers.map((h) => COLUMN_MAP[h] || null);

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => !v)) continue;

    const data: ParsedClient = {
      first_name: '', last_name: '', email: '', phone: '', phone_2: '',
      date_of_birth: '', address_street: '', address_city: '', address_state: 'CA',
      address_zip: '', status: 'Lead', source: '', notes: '',
    };

    columnMapping.forEach((field, idx) => {
      if (field && values[idx]) {
        data[field] = values[idx];
      }
    });

    const errors = validateRow(data, i + 1);
    rows.push({ data, errors, rowNumber: i + 1 });
  }

  return { rows, headers: rawHeaders };
}

export function BulkClientImportDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({ success: 0, failed: 0, errors: [] as string[] });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setParsedRows([]);
    setFileName('');
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });
    setIsDragging(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetState();
    onOpenChange(isOpen);
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { rows } = parseCSV(content);
      if (rows.length === 0) {
        toast.error('No valid data rows found in CSV');
        return;
      }
      setParsedRows(rows);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    const validRows = parsedRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }

    setStep('importing');
    const { data: { session } } = await supabase.auth.getSession();
    const agentId = session?.user?.id;
    if (!agentId) {
      toast.error('You must be logged in');
      setStep('preview');
      return;
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const batchSize = 25;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map((r) => ({
        first_name: r.data.first_name,
        last_name: r.data.last_name,
        email: r.data.email,
        phone: r.data.phone || '',
        phone_2: r.data.phone_2 || '',
        date_of_birth: r.data.date_of_birth || null,
        address_street: r.data.address_street || '',
        address_city: r.data.address_city || '',
        address_state: r.data.address_state || 'CA',
        address_zip: r.data.address_zip || '',
        status: r.data.status || 'Lead',
        source: r.data.source || '',
        notes: r.data.notes || '',
        assigned_agent_id: agentId,
      }));

      const { error, data } = await supabase.from('clients').insert(batch).select('id');
      if (error) {
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        success += (data?.length || 0);
        failed += batch.length - (data?.length || 0);
      }

      setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImportResults({ success, failed, errors });
    setStep('done');
    if (success > 0) onComplete();
  };

  const validCount = parsedRows.filter((r) => r.errors.length === 0).length;
  const errorCount = parsedRows.filter((r) => r.errors.length > 0).length;

  const downloadTemplate = () => {
    const csv = 'first_name,last_name,email,phone,phone_2,date_of_birth,address_street,address_city,address_state,address_zip,status,source,notes\nJohn,Doe,john.doe@example.com,(555) 123-4567,,(1990-01-15),123 Main St,Cerritos,CA,90703,Lead,Referral,New client from referral';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#1E40AF]" />
            {step === 'upload' && 'Import Clients from CSV'}
            {step === 'preview' && 'Review Import Data'}
            {step === 'importing' && 'Importing Clients...'}
            {step === 'done' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragging ? 'border-[#1E40AF] bg-blue-50/50' : 'border-gray-200 hover:border-[#1E40AF]/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-[#1E40AF]' : 'text-muted-foreground/50'}`} />
              <p className="font-medium text-sm">
                {isDragging ? 'Drop your CSV file here' : 'Drag & drop a CSV file here, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) processFile(file); }}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium">Need a template?</p>
                <p className="text-[10px] text-muted-foreground">Download our CSV template with all supported columns</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template
              </Button>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium mb-2">Supported columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {['first_name', 'last_name', 'email', 'phone', 'phone_2', 'date_of_birth', 'address_street', 'address_city', 'address_state', 'address_zip', 'status', 'source', 'notes'].map((col) => (
                  <Badge key={col} variant="secondary" className="text-[10px]">{col}</Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Column names are flexible -- &quot;First Name&quot;, &quot;first_name&quot;, or &quot;firstname&quot; all work.
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" /> {fileName}
                </Badge>
                <span className="text-xs text-muted-foreground">{parsedRows.length} rows found</span>
              </div>
              <div className="flex items-center gap-2">
                {validCount > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {validCount} valid
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 gap-1">
                    <XCircle className="h-3 w-3" /> {errorCount} errors
                  </Badge>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 border rounded-lg" style={{ maxHeight: '350px' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, i) => (
                    <TableRow key={i} className={row.errors.length > 0 ? 'bg-red-50/50' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell className="text-xs font-medium">{row.data.first_name} {row.data.last_name}</TableCell>
                      <TableCell className="text-xs">{row.data.email}</TableCell>
                      <TableCell className="text-xs">{row.data.phone}</TableCell>
                      <TableCell className="text-xs">{row.data.address_city}{row.data.address_state ? `, ${row.data.address_state}` : ''}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{row.data.status || 'Lead'}</Badge></TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <div className="group relative">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <div className="absolute right-0 bottom-6 z-50 hidden group-hover:block w-48 rounded-lg border bg-white p-2 shadow-lg">
                              {row.errors.map((e, ei) => (
                                <p key={ei} className="text-[10px] text-red-600">{e}</p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {errorCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {errorCount} row{errorCount > 1 ? 's' : ''} with errors will be skipped. Only {validCount} valid row{validCount !== 1 ? 's' : ''} will be imported.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={resetState}>Back</Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import {validCount} Client{validCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
              <Upload className="h-6 w-6 text-[#1E40AF] animate-pulse" />
            </div>
            <div>
              <p className="font-medium">Importing clients...</p>
              <p className="text-xs text-muted-foreground mt-1">{importProgress}% complete</p>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-[#1E40AF] transition-all rounded-full" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-6 space-y-4 text-center">
            <div className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center ${
              importResults.failed === 0 ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              {importResults.failed === 0 ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {importResults.success} client{importResults.success !== 1 ? 's' : ''} imported
              </p>
              {importResults.failed > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  {importResults.failed} failed
                </p>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left max-h-32 overflow-y-auto">
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            )}

            <Button onClick={() => handleClose(false)} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
