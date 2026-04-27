'use client';

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CircleCheck as CheckCircle2,
  Circle as XCircle,
  TriangleAlert as AlertTriangle,
  Download,
  Users,
  ArrowRight,
  Merge,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import type { Client } from '@/lib/types';

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
  warnings: string[];
  rowNumber: number;
}

type MergeAction = 'merge' | 'new' | 'skip';

interface DuplicateMatch {
  csvRow: ImportRow;
  existingClient: Client;
  matchReason: string;
  action: MergeAction;
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

function validateRow(data: ParsedClient): string[] {
  const warnings: string[] = [];
  const hasName = data.first_name || data.last_name;
  const hasEmail = data.email;
  const hasPhone = data.phone;

  if (!hasName && !hasEmail && !hasPhone) {
    warnings.push('Row has no identifying info (name, email, or phone) -- will be skipped');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    warnings.push('Invalid email format');
  }
  if (data.status && !VALID_STATUSES.includes(data.status)) {
    warnings.push(`Invalid status "${data.status}" -- will default to Lead`);
  }
  if (data.source && !VALID_SOURCES.includes(data.source)) {
    warnings.push(`Invalid source "${data.source}" -- will be cleared`);
  }
  return warnings;
}

function isRowImportable(row: ImportRow): boolean {
  const d = row.data;
  const hasIdentifier = d.first_name || d.last_name || d.email || d.phone;
  const hasInvalidEmail = d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);
  return !!hasIdentifier && !hasInvalidEmail;
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
      date_of_birth: '', address_street: '', address_city: '', address_state: '',
      address_zip: '', status: '', source: '', notes: '',
    };

    columnMapping.forEach((field, idx) => {
      if (field && values[idx]) {
        data[field] = values[idx];
      }
    });

    const warnings = validateRow(data);
    rows.push({ data, warnings, rowNumber: i + 1 });
  }

  return { rows, headers: rawHeaders };
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function findDuplicates(csvRow: ImportRow, existingClients: Client[]): { client: Client; reason: string } | null {
  const d = csvRow.data;

  if (d.email) {
    const emailMatch = existingClients.find(
      (c) => c.email && c.email.toLowerCase() === d.email.toLowerCase()
    );
    if (emailMatch) return { client: emailMatch, reason: 'Same email address' };
  }

  const csvName = `${d.first_name} ${d.last_name}`.toLowerCase().trim();
  if (csvName && csvName !== ' ') {
    if (d.phone) {
      const csvPhone = normalizePhone(d.phone);
      if (csvPhone.length >= 7) {
        const namePhoneMatch = existingClients.find((c) => {
          const existingName = `${c.first_name} ${c.last_name}`.toLowerCase().trim();
          const existingPhone = normalizePhone(c.phone || '');
          return existingName === csvName && existingPhone === csvPhone;
        });
        if (namePhoneMatch) return { client: namePhoneMatch, reason: 'Same name and phone' };
      }
    }

    if (d.address_street && d.address_city) {
      const nameAddrMatch = existingClients.find((c) => {
        const existingName = `${c.first_name} ${c.last_name}`.toLowerCase().trim();
        return (
          existingName === csvName &&
          c.address_street?.toLowerCase() === d.address_street.toLowerCase() &&
          c.address_city?.toLowerCase() === d.address_city.toLowerCase()
        );
      });
      if (nameAddrMatch) return { client: nameAddrMatch, reason: 'Same name and address' };
    }
  }

  return null;
}

function mergeClientData(existing: Client, csvData: ParsedClient): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (csvData.first_name && !existing.first_name) updates.first_name = csvData.first_name;
  if (csvData.last_name && !existing.last_name) updates.last_name = csvData.last_name;
  if (csvData.email && !existing.email) updates.email = csvData.email;
  if (csvData.phone && !existing.phone) updates.phone = csvData.phone;
  if (csvData.phone_2 && !existing.phone_2) updates.phone_2 = csvData.phone_2;
  if (csvData.date_of_birth && !existing.date_of_birth) updates.date_of_birth = csvData.date_of_birth;
  if (csvData.address_street && !existing.address_street) updates.address_street = csvData.address_street;
  if (csvData.address_city && !existing.address_city) updates.address_city = csvData.address_city;
  if (csvData.address_state && !existing.address_state) updates.address_state = csvData.address_state;
  if (csvData.address_zip && !existing.address_zip) updates.address_zip = csvData.address_zip;
  if (csvData.notes && csvData.notes !== existing.notes) {
    updates.notes = existing.notes
      ? `${existing.notes}\n---\n${csvData.notes}`
      : csvData.notes;
  }
  return updates;
}

const FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  phone_2: 'Phone 2',
  date_of_birth: 'Date of Birth',
  address_street: 'Street',
  address_city: 'City',
  address_state: 'State',
  address_zip: 'ZIP',
  status: 'Status',
  source: 'Source',
  notes: 'Notes',
};

function DuplicateCard({
  match,
  onActionChange,
}: {
  match: DuplicateMatch;
  onActionChange: (action: MergeAction) => void;
}) {
  const csvData = match.csvRow.data;
  const existing = match.existingClient;
  const mergeable = mergeClientData(existing, csvData);
  const mergeCount = Object.keys(mergeable).length;

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
        <Users className="h-4 w-4 text-amber-600" />
        <span className="text-xs font-medium text-amber-800">
          Row {match.csvRow.rowNumber}: {match.matchReason}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-0 divide-x text-xs">
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Existing Client
          </p>
          <div className="space-y-1">
            <p className="font-medium">{existing.first_name} {existing.last_name}</p>
            {existing.email && <p className="text-muted-foreground">{existing.email}</p>}
            {existing.phone && <p className="text-muted-foreground">{existing.phone}</p>}
            {existing.address_city && (
              <p className="text-muted-foreground">
                {existing.address_city}{existing.address_state ? `, ${existing.address_state}` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            From CSV
          </p>
          <div className="space-y-1">
            <p className="font-medium">{csvData.first_name} {csvData.last_name}</p>
            {csvData.email && <p className="text-muted-foreground">{csvData.email}</p>}
            {csvData.phone && <p className="text-muted-foreground">{csvData.phone}</p>}
            {csvData.address_city && (
              <p className="text-muted-foreground">
                {csvData.address_city}{csvData.address_state ? `, ${csvData.address_state}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {mergeCount > 0 && match.action === 'merge' && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-[10px] text-blue-700">
            Will fill in: {Object.keys(mergeable).map((k) => FIELD_LABELS[k] || k).join(', ')}
          </p>
        </div>
      )}

      <div className="px-4 py-3 border-t bg-gray-50/50">
        <RadioGroup
          value={match.action}
          onValueChange={(v) => onActionChange(v as MergeAction)}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="merge" id={`merge-${match.csvRow.rowNumber}`} />
            <Label
              htmlFor={`merge-${match.csvRow.rowNumber}`}
              className="text-xs cursor-pointer flex items-center gap-1"
            >
              <Merge className="h-3 w-3" />
              Update existing
              {mergeCount > 0 && (
                <Badge variant="secondary" className="text-[9px] ml-1">
                  +{mergeCount} field{mergeCount > 1 ? 's' : ''}
                </Badge>
              )}
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="new" id={`new-${match.csvRow.rowNumber}`} />
            <Label
              htmlFor={`new-${match.csvRow.rowNumber}`}
              className="text-xs cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Create new client
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="skip" id={`skip-${match.csvRow.rowNumber}`} />
            <Label
              htmlFor={`skip-${match.csvRow.rowNumber}`}
              className="text-xs cursor-pointer"
            >
              Skip this row
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
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
  const [step, setStep] = useState<'upload' | 'preview' | 'duplicates' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [newRows, setNewRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState({
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setParsedRows([]);
    setDuplicateMatches([]);
    setNewRows([]);
    setFileName('');
    setImportProgress(0);
    setImportResults({ inserted: 0, updated: 0, skipped: 0, failed: 0, errors: [] });
    setIsDragging(false);
    setCheckingDuplicates(false);
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
        toast.error('No data rows found in CSV');
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

  const checkForDuplicates = async () => {
    const importableRows = parsedRows.filter(isRowImportable);
    if (importableRows.length === 0) {
      toast.error('No importable rows found');
      return;
    }

    setCheckingDuplicates(true);
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*');

    if (!existingClients || existingClients.length === 0) {
      setNewRows(importableRows);
      setDuplicateMatches([]);
      setCheckingDuplicates(false);
      handleImport(importableRows, []);
      return;
    }

    const duplicates: DuplicateMatch[] = [];
    const freshRows: ImportRow[] = [];

    for (const row of importableRows) {
      const match = findDuplicates(row, existingClients);
      if (match) {
        duplicates.push({
          csvRow: row,
          existingClient: match.client,
          matchReason: match.reason,
          action: 'merge',
        });
      } else {
        freshRows.push(row);
      }
    }

    setNewRows(freshRows);
    setCheckingDuplicates(false);

    if (duplicates.length > 0) {
      setDuplicateMatches(duplicates);
      setStep('duplicates');
    } else {
      handleImport(freshRows, []);
    }
  };

  const handleDuplicateAction = (index: number, action: MergeAction) => {
    setDuplicateMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, action } : m))
    );
  };

  const applyAllDuplicateAction = (action: MergeAction) => {
    setDuplicateMatches((prev) => prev.map((m) => ({ ...m, action })));
  };

  const proceedWithDuplicates = () => {
    handleImport(newRows, duplicateMatches);
  };

  const handleImport = async (
    freshRows: ImportRow[],
    duplicates: DuplicateMatch[]
  ) => {
    setStep('importing');
    const { data: { session } } = await supabase.auth.getSession();
    const agentId = session?.user?.id;
    if (!agentId) {
      toast.error('You must be logged in');
      setStep('preview');
      return;
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    const totalWork = freshRows.length + duplicates.length;
    let processed = 0;

    const updateProgress = () => {
      processed++;
      setImportProgress(totalWork > 0 ? Math.round((processed / totalWork) * 100) : 100);
    };

    for (const dup of duplicates) {
      if (dup.action === 'skip') {
        skipped++;
        updateProgress();
        continue;
      }

      if (dup.action === 'merge') {
        const updates = mergeClientData(dup.existingClient, dup.csvRow.data);
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', dup.existingClient.id);
          if (error) {
            failed++;
            errors.push(`Row ${dup.csvRow.rowNumber} (merge): ${error.message}`);
          } else {
            updated++;
          }
        } else {
          updated++;
        }
        updateProgress();
        continue;
      }

      if (dup.action === 'new') {
        freshRows.push(dup.csvRow);
        updateProgress();
      }
    }

    const batchSize = 25;
    for (let i = 0; i < freshRows.length; i += batchSize) {
      const batch = freshRows.slice(i, i + batchSize).map((r) => {
        const d = r.data;
        return {
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          email: d.email || null,
          phone: d.phone || '',
          phone_2: d.phone_2 || '',
          date_of_birth: d.date_of_birth || null,
          address_street: d.address_street || '',
          address_city: d.address_city || '',
          address_state: d.address_state || '',
          address_zip: d.address_zip || '',
          status: d.status && VALID_STATUSES.includes(d.status) ? d.status : 'Lead',
          source: d.source && VALID_SOURCES.includes(d.source) ? d.source : '',
          notes: d.notes || '',
          assigned_agent_id: agentId,
        };
      });

      const { error, data } = await supabase.from('clients').insert(batch).select('id');
      if (error) {
        failed += batch.length;
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      } else {
        inserted += data?.length || 0;
        failed += batch.length - (data?.length || 0);
      }

      for (let j = 0; j < batch.length; j++) updateProgress();
    }

    setImportResults({ inserted, updated, skipped, failed, errors });
    setStep('done');
    if (inserted > 0 || updated > 0) onComplete();
  };

  const importableCount = parsedRows.filter(isRowImportable).length;
  const warningCount = parsedRows.filter(
    (r) => r.warnings.length > 0 && isRowImportable(r)
  ).length;
  const skipCount = parsedRows.filter((r) => !isRowImportable(r)).length;

  const downloadTemplate = () => {
    const csv =
      'first_name,last_name,email,phone,phone_2,date_of_birth,address_street,address_city,address_state,address_zip,status,source,notes\nJohn,Doe,john.doe@example.com,(555) 123-4567,,(1990-01-15),123 Main St,Cerritos,CA,90703,Lead,Referral,New client from referral';
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
            {step === 'duplicates' && 'Existing Clients Found'}
            {step === 'importing' && 'Importing Clients...'}
            {step === 'done' && 'Import Complete'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-[#1E40AF] bg-blue-50/50'
                  : 'border-gray-200 hover:border-[#1E40AF]/50 hover:bg-muted/30'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload
                className={`h-10 w-10 mx-auto mb-3 ${
                  isDragging ? 'text-[#1E40AF]' : 'text-muted-foreground/50'
                }`}
              />
              <p className="font-medium text-sm">
                {isDragging ? 'Drop your CSV file here' : 'Drag & drop a CSV file here, or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv files up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <div>
                <p className="text-xs font-medium">Need a template?</p>
                <p className="text-[10px] text-muted-foreground">
                  Download our CSV template with all supported columns
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-1.5 h-3.5 w-3.5" /> Template
              </Button>
            </div>

            <div className="rounded-lg border p-3">
              <p className="text-xs font-medium mb-2">Supported columns:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'first_name', 'last_name', 'email', 'phone', 'phone_2',
                  'date_of_birth', 'address_street', 'address_city',
                  'address_state', 'address_zip', 'status', 'source', 'notes',
                ].map((col) => (
                  <Badge key={col} variant="secondary" className="text-[10px]">
                    {col}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                All columns are optional. Column names are flexible -- &quot;First Name&quot;, &quot;first_name&quot;, or &quot;firstname&quot; all work. Rows with at least a name, email, or phone will be imported.
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
                {importableCount > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {importableCount} ready
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 gap-1">
                    <AlertTriangle className="h-3 w-3" /> {warningCount} warnings
                  </Badge>
                )}
                {skipCount > 0 && (
                  <Badge className="bg-red-100 text-red-700 gap-1">
                    <XCircle className="h-3 w-3" /> {skipCount} skipped
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
                  {parsedRows.map((row, i) => {
                    const importable = isRowImportable(row);
                    return (
                      <TableRow
                        key={i}
                        className={!importable ? 'bg-red-50/50 opacity-60' : row.warnings.length > 0 ? 'bg-amber-50/30' : ''}
                      >
                        <TableCell className="text-xs text-muted-foreground">{row.rowNumber}</TableCell>
                        <TableCell className="text-xs font-medium">
                          {row.data.first_name || row.data.last_name
                            ? `${row.data.first_name} ${row.data.last_name}`.trim()
                            : <span className="text-muted-foreground italic">--</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.data.email || <span className="text-muted-foreground italic">--</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.data.phone || <span className="text-muted-foreground italic">--</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.data.address_city
                            ? `${row.data.address_city}${row.data.address_state ? `, ${row.data.address_state}` : ''}`
                            : <span className="text-muted-foreground italic">--</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {row.data.status || 'Lead'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!importable ? (
                            <div className="group relative">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <div className="absolute right-0 bottom-6 z-50 hidden group-hover:block w-48 rounded-lg border bg-white p-2 shadow-lg">
                                {row.warnings.map((w, wi) => (
                                  <p key={wi} className="text-[10px] text-red-600">{w}</p>
                                ))}
                              </div>
                            </div>
                          ) : row.warnings.length > 0 ? (
                            <div className="group relative">
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                              <div className="absolute right-0 bottom-6 z-50 hidden group-hover:block w-48 rounded-lg border bg-white p-2 shadow-lg">
                                {row.warnings.map((w, wi) => (
                                  <p key={wi} className="text-[10px] text-amber-600">{w}</p>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            {skipCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  {skipCount} row{skipCount > 1 ? 's' : ''} without identifiable info will be skipped.{' '}
                  {importableCount} row{importableCount !== 1 ? 's' : ''} will be checked for duplicates and imported.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={checkForDuplicates}
                disabled={importableCount === 0 || checkingDuplicates}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
              >
                {checkingDuplicates ? (
                  <>
                    <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'duplicates' && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <Users className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">
                We found {duplicateMatches.length} client{duplicateMatches.length > 1 ? 's' : ''} that may already exist. Choose what to do with each:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Set all to:</span>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyAllDuplicateAction('merge')}
              >
                <Merge className="h-2.5 w-2.5 mr-1" /> Update All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyAllDuplicateAction('new')}
              >
                <UserPlus className="h-2.5 w-2.5 mr-1" /> Create All New
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => applyAllDuplicateAction('skip')}
              >
                Skip All
              </Button>
            </div>

            <ScrollArea className="flex-1" style={{ maxHeight: '340px' }}>
              <div className="space-y-3 pr-3">
                {duplicateMatches.map((match, i) => (
                  <DuplicateCard
                    key={i}
                    match={match}
                    onActionChange={(action) => handleDuplicateAction(i, action)}
                  />
                ))}
              </div>
            </ScrollArea>

            {newRows.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3">
                <UserPlus className="h-4 w-4 text-[#1E40AF] shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800">
                  {newRows.length} new client{newRows.length > 1 ? 's' : ''} will also be added.
                </p>
              </div>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Back
              </Button>
              <Button
                onClick={proceedWithDuplicates}
                className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white"
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import
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
              <div
                className="h-full bg-[#1E40AF] transition-all rounded-full"
                style={{ width: `${importProgress}%` }}
              />
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-6 space-y-4 text-center">
            <div
              className={`h-14 w-14 mx-auto rounded-full flex items-center justify-center ${
                importResults.failed === 0 ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              {importResults.failed === 0 ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">Import Complete</p>
              <div className="flex items-center justify-center gap-4 mt-2">
                {importResults.inserted > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-[#1E40AF]">{importResults.inserted}</p>
                    <p className="text-[10px] text-muted-foreground">New clients</p>
                  </div>
                )}
                {importResults.updated > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-emerald-600">{importResults.updated}</p>
                    <p className="text-[10px] text-muted-foreground">Updated</p>
                  </div>
                )}
                {importResults.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-400">{importResults.skipped}</p>
                    <p className="text-[10px] text-muted-foreground">Skipped</p>
                  </div>
                )}
                {importResults.failed > 0 && (
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-500">{importResults.failed}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                )}
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left max-h-32 overflow-y-auto">
                {importResults.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {err}
                  </p>
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
