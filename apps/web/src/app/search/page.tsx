'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  FileText,
  Briefcase,
  Shield,
  Clock,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  X,
  FileSearch,
  Check,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  ClassificationLevel,
  DocumentStatus,
  SearchResultItem,
  SearchResultsResponse,
} from '@sdms/shared-types';

export default function SearchPage() {
  const { user } = useAuth();

  // Search input state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Facet filter state
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Search results & pagination state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Verification modal state
  const [activeOcrDoc, setActiveOcrDoc] = useState<SearchResultItem | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrTranscript, setOcrTranscript] = useState('');
  const [ocrType, setOcrType] = useState('');
  const [ocrClassification, setOcrClassification] = useState<ClassificationLevel>(
    ClassificationLevel.RESTRICTED,
  );
  const [verifying, setVerifying] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  // Debounce search query input (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Execute search API request
  const fetchSearchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.append('q', debouncedQuery.trim());
      if (selectedType) params.append('type', selectedType);
      if (selectedClassification) params.append('classification', selectedClassification);
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(currentPage));
      params.append('limit', '15');

      const res = await fetch(`/api/v1/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search failed: HTTP ${res.status}`);
      }

      const data: SearchResultsResponse = await res.json();
      setResults(data.results || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    selectedType,
    selectedClassification,
    selectedStatus,
    startDate,
    endDate,
    currentPage,
  ]);

  useEffect(() => {
    fetchSearchResults();
  }, [fetchSearchResults]);

  // Load document OCR data for inspection / verification modal
  const openOcrModal = async (item: SearchResultItem) => {
    setActiveOcrDoc(item);
    setOcrLoading(true);
    setVerifySuccess(null);
    setOcrType(item.type);
    setOcrClassification(item.classification);

    try {
      const res = await fetch(`/api/v1/documents/${item.documentId}/ocr`);
      if (res.ok) {
        const data = await res.json();
        setOcrTranscript(data.ocrResult?.extractedText || '');
        if (data.ocrResult?.extractedMetadata?.detectedType) {
          setOcrType(data.ocrResult.extractedMetadata.detectedType);
        }
      } else {
        setOcrTranscript(item.snippet?.replace(/<[^>]+>/g, '') || '');
      }
    } catch {
      setOcrTranscript(item.snippet?.replace(/<[^>]+>/g, '') || '');
    } finally {
      setOcrLoading(false);
    }
  };

  // Submit human verification
  const handleVerifySubmit = async () => {
    if (!activeOcrDoc) return;
    setVerifying(true);
    setVerifySuccess(null);

    try {
      const res = await fetch(`/api/v1/documents/${activeOcrDoc.documentId}/ocr/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: ocrTranscript,
          type: ocrType,
          classification: ocrClassification,
        }),
      });

      if (!res.ok) {
        throw new Error(`Verification failed: HTTP ${res.status}`);
      }

      setVerifySuccess('Document OCR transcription and classification verified successfully.');
      setTimeout(() => {
        setActiveOcrDoc(null);
        fetchSearchResults();
      }, 1500);
    } catch (err) {
      alert(`Error verifying: ${(err as Error).message}`);
    } finally {
      setVerifying(false);
    }
  };

  // Manual OCR Retry
  const handleRetryOcr = async () => {
    if (!activeOcrDoc) return;
    setRetrying(true);

    try {
      const res = await fetch(`/api/v1/documents/${activeOcrDoc.documentId}/ocr/retry`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`Retry failed: HTTP ${res.status}`);
      }

      setVerifySuccess('OCR processing re-enqueued. Document will be re-analyzed.');
      setTimeout(() => {
        setActiveOcrDoc(null);
        fetchSearchResults();
      }, 1500);
    } catch (err) {
      alert(`Error retrying OCR: ${(err as Error).message}`);
    } finally {
      setRetrying(false);
    }
  };

  // Badges
  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case ClassificationLevel.PUBLIC:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case ClassificationLevel.RESTRICTED:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case ClassificationLevel.CONFIDENTIAL:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case ClassificationLevel.SECRET:
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case DocumentStatus.READY:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case DocumentStatus.NEEDS_REVIEW:
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case DocumentStatus.PROCESSING:
        return 'bg-blue-500/10 text-primary border-blue-500/20 animate-pulse';
      case DocumentStatus.FAILED:
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text flex items-center gap-2.5">
              <FileSearch className="w-6 h-6 text-primary" />
              OCR & Full-Text Evidence Search
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              Phase 5
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Search scanned records, extracted legal transcripts, statutory sections, and forensic
            exhibits with strict ABAC authorization.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/cases"
            className="px-3.5 py-2 bg-surface-alt hover:bg-border text-text text-xs font-semibold rounded-lg border border-border transition flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5 text-muted" />
            <span>Case Repository</span>
          </Link>
          <Link
            href="/upload"
            className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>Upload New Evidence</span>
          </Link>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by keywords, accused names, FIR numbers, IPC/BNSS sections, dates, or forensic findings..."
            className="w-full pl-11 pr-10 py-3 bg-surface-alt border border-border rounded-xl text-sm text-text placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-text rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Faceted Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-border/60">
          {/* Document Type Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-hidden focus:border-primary"
            >
              <option value="">All Document Types</option>
              <option value="FIR">FIR (Sec 154 CrPC)</option>
              <option value="CHARGE_SHEET">Charge Sheet (Sec 173)</option>
              <option value="WITNESS_STATEMENT">Witness Statement (Sec 161)</option>
              <option value="SEIZURE_MEMO">Seizure Memo / Panchnama</option>
              <option value="FORENSIC_REPORT">Forensic / Post-Mortem</option>
              <option value="COURT_ORDER">Court Order / Bail</option>
              <option value="IDENTITY_DOCUMENT">Identity (Aadhaar/PAN)</option>
              <option value="GENERAL_EVIDENCE">General Evidence</option>
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
              Clearance Level
            </label>
            <select
              value={selectedClassification}
              onChange={(e) => {
                setSelectedClassification(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-hidden focus:border-primary"
            >
              <option value="">All Classifications</option>
              <option value={ClassificationLevel.PUBLIC}>Public</option>
              <option value={ClassificationLevel.RESTRICTED}>Restricted</option>
              <option value={ClassificationLevel.CONFIDENTIAL}>Confidential</option>
              <option value={ClassificationLevel.SECRET}>Secret</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
              OCR Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-hidden focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value={DocumentStatus.READY}>Verified / Ready</option>
              <option value={DocumentStatus.NEEDS_REVIEW}>Needs Human Review</option>
              <option value={DocumentStatus.PROCESSING}>Processing</option>
              <option value={DocumentStatus.FAILED}>Failed</option>
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-hidden focus:border-primary"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 text-text focus:outline-hidden focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Results Header Info */}
      <div className="flex items-center justify-between text-xs text-muted px-1">
        <span>
          Showing <strong className="text-text">{results.length}</strong> of{' '}
          <strong className="text-text">{totalCount}</strong> authorized evidence records
          {debouncedQuery && (
            <span>
              {' '}
              matching &quot;<strong className="text-text">{debouncedQuery}</strong>&quot;
            </span>
          )}
        </span>

        {loading && (
          <span className="flex items-center gap-1.5 text-primary font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Searching database...
          </span>
        )}
      </div>

      {/* Results Listing */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Search query failed: {error}</span>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="bg-surface border border-dashed border-border rounded-xl p-12 text-center space-y-3">
          <FileSearch className="w-10 h-10 text-muted mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-text">No Evidence Records Found</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            {debouncedQuery
              ? `No records found matching "${debouncedQuery}" within your current ABAC clearance level.`
              : 'Try searching for case numbers, FIR details, or legal keywords.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((item) => (
          <div
            key={item.documentId}
            className="bg-surface border border-border hover:border-primary/40 rounded-xl p-4.5 transition shadow-xs space-y-3"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-text hover:text-primary transition">
                    <Link href={`/cases/${item.caseId}`}>{item.title}</Link>
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    v{item.versionNo}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getClassificationBadge(
                      item.classification,
                    )}`}
                  >
                    {item.classification}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                      item.status,
                    )}`}
                  >
                    {item.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-muted flex items-center gap-3 flex-wrap">
                  <span>
                    Case:{' '}
                    <Link
                      href={`/cases/${item.caseId}`}
                      className="font-mono font-bold text-text hover:text-primary transition"
                    >
                      {item.caseNumber}
                    </Link>
                  </span>
                  <span>•</span>
                  <span>{item.caseTitle}</span>
                  <span>•</span>
                  <span>
                    Type: <strong className="text-text">{item.type.replace('_', ' ')}</strong>
                  </span>
                  <span>•</span>
                  <span>Attached: {new Date(item.createdAt).toLocaleDateString()}</span>
                  {typeof item.ocrConfidence === 'number' && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-semibold">
                        OCR Confidence: {Math.round(item.ocrConfidence * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openOcrModal(item)}
                  className="px-3 py-1.5 bg-surface-alt hover:bg-border text-text text-xs font-semibold rounded-lg border border-border transition flex items-center gap-1.5"
                  title="Inspect OCR transcript & verified metadata"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>OCR & Verify</span>
                </button>

                <a
                  href={`/api/v1/documents/${item.documentId}/download`}
                  className="px-3 py-1.5 bg-surface-alt hover:bg-border text-text text-xs font-semibold rounded-lg border border-border transition flex items-center gap-1.5"
                  title="Securely download file"
                >
                  <Download className="w-3.5 h-3.5 text-muted" />
                  <span>Download</span>
                </a>

                <Link
                  href={`/cases/${item.caseId}`}
                  className="p-1.5 text-muted hover:text-text hover:bg-surface-alt rounded-lg transition"
                  title="Open Case Dossier"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Contextual Highlighted Snippet */}
            {item.snippet && (
              <div
                className="text-xs text-text/90 bg-surface-alt/70 border border-border/80 p-3 rounded-lg font-mono leading-relaxed select-text"
                dangerouslySetInnerHTML={{ __html: item.snippet }}
              />
            )}

            {/* Extracted Intelligence Tags (FIR numbers, sections, parties) */}
            {item.extractedMetadata && (
              <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                {Array.isArray(item.extractedMetadata['caseNumbers']) &&
                  (item.extractedMetadata['caseNumbers'] as string[]).map((num, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-surface border border-border text-muted font-mono"
                    >
                      Ref: <strong className="text-text">{num}</strong>
                    </span>
                  ))}

                {Array.isArray(item.extractedMetadata['sections']) &&
                  (item.extractedMetadata['sections'] as string[]).slice(0, 3).map((sec, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/20 font-semibold"
                    >
                      {sec}
                    </span>
                  ))}

                {Boolean(item.extractedMetadata['policeStation']) && (
                  <span className="px-2 py-0.5 rounded bg-surface border border-border text-muted">
                    PS:{' '}
                    <strong className="text-text">
                      {String(item.extractedMetadata['policeStation'])}
                    </strong>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 bg-surface border border-border text-xs font-semibold rounded-lg disabled:opacity-50 transition"
          >
            Previous
          </button>
          <span className="text-xs text-muted">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 bg-surface border border-border text-xs font-semibold rounded-lg disabled:opacity-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {/* Human Verification & OCR Inspection Modal */}
      {activeOcrDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-alt/40">
              <div>
                <h3 className="text-sm font-bold text-text flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Human Verification & OCR Inspection
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {activeOcrDoc.title} ({activeOcrDoc.caseNumber})
                </p>
              </div>
              <button
                onClick={() => setActiveOcrDoc(null)}
                className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-surface transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {verifySuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{verifySuccess}</span>
                </div>
              )}

              {/* Status and Confidence Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-alt p-3.5 rounded-xl border border-border">
                <div>
                  <span className="text-[10px] font-bold text-muted uppercase">Status</span>
                  <div className="mt-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                        activeOcrDoc.status,
                      )}`}
                    >
                      {activeOcrDoc.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted uppercase">Confidence</span>
                  <div className="mt-1 font-semibold text-text">
                    {typeof activeOcrDoc.ocrConfidence === 'number'
                      ? `${Math.round(activeOcrDoc.ocrConfidence * 100)}% Match`
                      : 'Pending Evaluation'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-muted uppercase">Actions</span>
                  <div className="mt-1">
                    <button
                      onClick={handleRetryOcr}
                      disabled={retrying}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                      <span>{retrying ? 'Retrying...' : 'Re-run OCR Job'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Document Classification & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-muted uppercase block mb-1">
                    Confirmed Document Type
                  </label>
                  <select
                    value={ocrType}
                    onChange={(e) => setOcrType(e.target.value)}
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 text-text focus:outline-hidden focus:border-primary"
                  >
                    <option value="FIR">FIR (Section 154 CrPC)</option>
                    <option value="CHARGE_SHEET">Charge Sheet (Section 173)</option>
                    <option value="WITNESS_STATEMENT">Witness Statement (Section 161)</option>
                    <option value="SEIZURE_MEMO">Seizure Memo / Panchnama</option>
                    <option value="FORENSIC_REPORT">Forensic Report / Autopsy</option>
                    <option value="COURT_ORDER">Court Order / Bail Order</option>
                    <option value="IDENTITY_DOCUMENT">Identity (Aadhaar / PAN)</option>
                    <option value="GENERAL_EVIDENCE">General Evidence</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted uppercase block mb-1">
                    Confirmed Classification
                  </label>
                  <select
                    value={ocrClassification}
                    onChange={(e) => setOcrClassification(e.target.value as ClassificationLevel)}
                    className="w-full text-xs bg-surface border border-border rounded-lg px-3 py-2 text-text focus:outline-hidden focus:border-primary"
                  >
                    <option value={ClassificationLevel.PUBLIC}>Public</option>
                    <option value={ClassificationLevel.RESTRICTED}>Restricted</option>
                    <option value={ClassificationLevel.CONFIDENTIAL}>Confidential</option>
                    <option value={ClassificationLevel.SECRET}>Secret</option>
                  </select>
                </div>
              </div>

              {/* Editable OCR Transcript */}
              <div>
                <label className="text-[11px] font-bold text-muted uppercase flex items-center justify-between mb-1">
                  <span>OCR Transcript Text (Editable)</span>
                  <span className="text-[10px] text-muted normal-case">
                    Correct any transcription errors before confirming
                  </span>
                </label>
                {ocrLoading ? (
                  <div className="h-44 flex items-center justify-center bg-surface-alt rounded-xl border border-border">
                    <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    value={ocrTranscript}
                    onChange={(e) => setOcrTranscript(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-surface-alt border border-border rounded-xl text-text focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition leading-relaxed"
                    placeholder="OCR text extracted from document..."
                  />
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-surface-alt/40 flex items-center justify-between">
              <span className="text-[11px] text-muted">
                Audit event <strong className="text-text">OCR_VERIFIED</strong> will be recorded
                upon confirmation.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveOcrDoc(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-text hover:bg-surface-alt rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifySubmit}
                  disabled={verifying}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {verifying ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirm & Mark Verified</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
