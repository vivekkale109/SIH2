'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  FileUp,
  RefreshCw,
  Lock,
  ArrowRight,
  Briefcase,
  HardDrive,
  FileCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ClassificationLevel, CaseSummary, DocumentDetailSummary } from '@sdms/shared-types';

const DOCUMENT_TYPES = [
  { value: 'FORENSIC_REPORT', label: 'Digital Forensic Report' },
  { value: 'FIR', label: 'First Information Report (FIR)' },
  { value: 'CHARGE_SHEET', label: 'Charge Sheet / Final Form' },
  { value: 'WITNESS_STATEMENT', label: 'Witness Statement (BSA §61)' },
  { value: 'SEIZURE_MEMO', label: 'Seizure Memo / Panchnama' },
  { value: 'CASE_DIARY', label: 'Case Diary Record' },
  { value: 'EXPERT_OPINION', label: 'Expert Opinion / Ballistics' },
  { value: 'OTHER', label: 'General Legal Exhibit' },
];

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = searchParams.get('caseId');
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(caseIdParam || '');
  const [title, setTitle] = useState<string>('');
  const [docType, setDocType] = useState<string>('FORENSIC_REPORT');
  const [classification, setClassification] = useState<ClassificationLevel>(
    ClassificationLevel.RESTRICTED,
  );
  const [file, setFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<DocumentDetailSummary | null>(null);

  useEffect(() => {
    if (caseIdParam) {
      setSelectedCaseId(caseIdParam);
    }
  }, [caseIdParam]);

  useEffect(() => {
    async function loadCases() {
      if (!token) return;
      try {
        const res = await fetch('/api/v1/cases?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.items || [];
          setCases(items);
          if (caseIdParam) {
            setSelectedCaseId(caseIdParam);
          } else if (items.length > 0) {
            setSelectedCaseId(items[0].id);
          }
        }
      } catch {
        // Fallback demo cases if API unreachable
        setCases([
          {
            id: 'case-demo-1',
            caseNumber: 'FIR-2026-DEL-0042',
            title: 'Financial Securities Manipulation Investigation',
            status: 'OPEN' as any,
            classification: ClassificationLevel.RESTRICTED,
            departmentId: 'POL-CCB',
            createdById: 'demo-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        setSelectedCaseId(caseIdParam || 'case-demo-1');
      }
    }
    loadCases();
  }, [token, caseIdParam]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  const selectFile = (selectedFile: File) => {
    setErrorMsg(null);
    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMsg('File size exceeds the maximum limit of 50 MB.');
      return;
    }
    setFile(selectedFile);
    if (!title) {
      // Auto-populate title from filename without extension
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedCaseId || !title.trim()) {
      setErrorMsg(
        'Please select an active case, specify a document title, and attach an evidence file.',
      );
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress(15);
    setScanStatus('Scanning file with ClamAV for virus & malware signatures...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('type', docType);
    formData.append('classification', classification);

    try {
      setUploadProgress(45);
      setScanStatus('Computing SHA-256 digest & encrypting to MinIO Object Storage...');

      const res = await fetch(`/api/v1/cases/${selectedCaseId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(85);

      if (res.ok) {
        setUploadProgress(100);
        setScanStatus('Ingestion confirmed. Writing immutable hash-chained audit record...');
        const docResult: DocumentDetailSummary = await res.json();
        setUploadedResult(docResult);
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to ingest document');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Upload failed: ${msg}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle('');
    setUploadedResult(null);
    setErrorMsg(null);
    setUploadProgress(0);
    setScanStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb / Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2.5">
            <Upload className="w-6 h-6 text-primary" />
            Ingest Case Evidence
          </h1>
          <p className="text-xs text-muted mt-1">
            Secure digital document ingestion with ClamAV anti-malware verification, SHA-256
            cryptographic hashing, and MinIO SSE storage.
          </p>
        </div>

        <Link
          href="/cases"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View Case Dossiers
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Success Receipt Modal/Card */}
      {uploadedResult && (
        <div className="bg-surface border-2 border-emerald-500/30 rounded-2xl p-6 shadow-md space-y-5 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Ingestion & Integrity Verified
                </span>
                <h2 className="text-lg font-bold text-text">{uploadedResult.title}</h2>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="text-muted hover:text-text p-1 transition"
              title="Close receipt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-alt/70 p-4 rounded-xl border border-border text-xs">
            <div>
              <span className="text-muted block text-[11px]">Assigned Case Number</span>
              <span className="font-mono font-bold text-text">
                {uploadedResult.case?.caseNumber || selectedCaseId}
              </span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Ingestion Version</span>
              <span className="font-semibold text-primary">
                Version {uploadedResult.latestVersionNo || 1} (Immutable)
              </span>
            </div>
            <div className="md:col-span-2">
              <span className="text-muted block text-[11px] mb-1">Cryptographic SHA-256 Seal</span>
              <div className="font-mono text-[11px] bg-surface p-2 rounded border border-border break-all select-all text-text">
                {uploadedResult.sha256}
              </div>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Storage Engine</span>
              <span className="font-semibold text-text flex items-center gap-1.5 mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-primary" />
                MinIO S3 (AES-256 SSE)
              </span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Classification Clearance</span>
              <span className="font-bold text-primary">{uploadedResult.classification}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/cases/${selectedCaseId}`}
              className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition flex items-center gap-2"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Open Case File
            </Link>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-surface-alt border border-border text-xs font-semibold text-text rounded-lg hover:bg-border/30 transition"
            >
              Upload Another Document
            </button>
          </div>
        </div>
      )}

      {/* Main Upload Form */}
      {!uploadedResult && (
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-6">
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-xs text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Target Case Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text uppercase tracking-wider block">
                Target Investigation Case <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                required
                className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary transition"
              >
                {cases.length === 0 ? (
                  <option value="">No open cases cleared for your account</option>
                ) : (
                  cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} — {c.title} ({c.classification})
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-muted">
                Only cases where your account holds ABAC clearance and active membership are
                selectable.
              </p>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text uppercase tracking-wider block">
                Evidence File <span className="text-rose-500">*</span>
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                  file
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-surface-alt/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInput}
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx,.txt"
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-text">{file.name}</div>
                    <div className="text-[11px] text-muted">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · {file.type || 'Document'}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-[11px] text-rose-500 hover:underline pt-1 block mx-auto"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-surface border border-border text-muted mx-auto flex items-center justify-center">
                      <FileUp className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-xs font-semibold text-text">
                      Click to choose or drag & drop evidence file
                    </div>
                    <div className="text-[11px] text-muted">
                      Accepted formats: PDF, TIFF, JPG, PNG, DOCX, TXT (Maximum 50 MB)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-text">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Forensic Hard Drive Acquisition Hash Report"
                  required
                  className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2 text-xs text-text focus:outline-none focus:border-primary transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Document Category</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2 text-xs text-text focus:outline-none focus:border-primary transition"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text">Security Classification</label>
                <select
                  value={classification}
                  onChange={(e) => setClassification(e.target.value as ClassificationLevel)}
                  className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2 text-xs text-text focus:outline-none focus:border-primary transition"
                >
                  <option value={ClassificationLevel.PUBLIC}>Public (Open Records)</option>
                  <option value={ClassificationLevel.RESTRICTED}>
                    Restricted (Department Only)
                  </option>
                  <option value={ClassificationLevel.CONFIDENTIAL}>
                    Confidential (Assigned Investigators)
                  </option>
                  <option value={ClassificationLevel.SECRET}>
                    Secret (Lead Investigator / Admin)
                  </option>
                </select>
              </div>
            </div>

            {/* Progress Bar / Scan indicator */}
            {isUploading && (
              <div className="space-y-2 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                    {scanStatus}
                  </span>
                  <span className="font-mono text-primary font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-alt rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Ingestion Security Checklist */}
            <div className="p-4 bg-surface-alt/60 border border-border rounded-xl space-y-2 text-xs">
              <span className="font-bold text-text uppercase tracking-wider text-[10px] block">
                Automated Integrity Guarantee
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-muted">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ClamAV In-Stream Virus Scan
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  SHA-256 Canonical Hashing
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  MinIO AES-256 SSE Encryption
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-surface-alt border border-border rounded-lg text-xs font-semibold text-muted hover:text-text transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !file || !title.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ingesting Document...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Ingest & Seal Evidence
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          Loading secure evidence upload portal...
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
