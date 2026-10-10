'use client';

import React, { useState } from 'react';
import {
  X,
  FileCheck2,
  Shield,
  Lock,
  AlertCircle,
  CheckCircle2,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { DocumentSummary, ExportPackageSummary } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  documents: DocumentSummary[];
  onExportSuccess?: (pkg: ExportPackageSummary) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseNumber,
  caseTitle,
  documents,
  onExportSuccess,
}) => {
  const { token, user } = useAuth();

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(documents.map((d) => d.id));
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<ExportPackageSummary | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Sync selectedDocIds if documents change
  React.useEffect(() => {
    if (documents.length > 0) {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  }, [documents]);

  if (!isOpen) return null;

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectAllDocs = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const deselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  const handleCopyHash = (hash: string) => {
    void navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCreateExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (selectedDocIds.length === 0) {
      setErrorMsg('Please select at least one evidence document to include in the export package.');
      return;
    }

    if (!passwordConfirm) {
      setErrorMsg(
        'Account password re-confirmation is strictly required for cryptographic signing.',
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/exports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentIds: selectedDocIds,
          passwordConfirm,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Export creation failed' }));
        throw new Error(errorData.message || 'Failed to generate court export package');
      }

      const data: ExportPackageSummary = await res.json();
      setSuccessResult(data);
      if (onExportSuccess) {
        onExportSuccess(data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while building the export package.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (pkgId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/exports/${pkgId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download request failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SDMS_EXPORT_${caseNumber}_${pkgId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setPasswordConfirm('');
    setNotes('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Generate Signed Evidence Export</h2>
              <p className="text-xs text-slate-400">
                Bharatiya Sakshya Adhiniyam, 2023 (§61–63) • Ed25519 Cryptographic Seal
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {successResult ? (
            /* Success State */
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-emerald-200">
                    Export Package Generated & Cryptographically Signed
                  </h4>
                  <p className="text-xs text-slate-300">
                    All selected evidence files have been validated against live storage SHA-256
                    digests, an official BSA 2023 §63 certificate was embedded, and the manifest was
                    sealed with Ed25519 elliptic curve signing.
                  </p>
                </div>
              </div>

              {/* Package Summary Box */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Package Identifier:</span>
                  <span className="font-mono text-indigo-300">{successResult.id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Case Reference:</span>
                  <span className="font-medium text-white">{caseNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Exhibits Attached:</span>
                  <span className="text-slate-200">{successResult.documentCount} documents</span>
                </div>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1 flex justify-between items-center">
                    <span>Canonical Manifest SHA-256 Digest:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyHash(successResult.manifestHash)}
                      className="text-slate-400 hover:text-white flex items-center space-x-1 text-[11px]"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-emerald-400 break-all select-all">
                    {successResult.manifestHash}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownload(successResult.id)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition shadow-lg shadow-indigo-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Signed Package (ZIP)</span>
                </button>
                <a
                  href="/verify"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium text-sm transition border border-slate-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Offline Verifier</span>
                </a>
              </div>

              <div className="text-right pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreateExport} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start space-x-2 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Case Context Details */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Target Case: </span>
                  <span className="font-semibold text-white">{caseNumber}</span>
                  <span className="text-slate-500 ml-2">({caseTitle})</span>
                </div>
                <div className="flex items-center space-x-1.5 text-indigo-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-medium">Official Export</span>
                </div>
              </div>

              {/* Document Exhibit Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-slate-200 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Select Attached Evidence Exhibits ({selectedDocIds.length}/{documents.length})
                    </span>
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={selectAllDocs}
                      className="text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={deselectAllDocs}
                      className="text-slate-400 hover:text-slate-300 transition"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/40 divide-y divide-slate-800/60">
                  {documents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      No documents currently attached to this case.
                    </div>
                  ) : (
                    documents.map((doc) => {
                      const isSelected = selectedDocIds.includes(doc.id);
                      return (
                        <label
                          key={doc.id}
                          className={`flex items-center space-x-3 px-3 py-2 text-xs cursor-pointer hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleDocSelection(doc.id)}
                            className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <div className="flex-1 truncate">
                            <span className="text-white font-medium">{doc.title}</span>
                            <span className="text-slate-500 ml-2">({doc.type})</span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            v{doc.latestVersionNo ?? 1}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Optional Case Notes for Certificate */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200">
                  Additional Certificate Endorsement Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Produced pursuant to Special Court Warrant No. SC/2026/8991. Chain of custody maintained."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Statutory Notice */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start space-x-2 text-amber-200/90 text-xs">
                <BadgeAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                <p>
                  <strong>Statutory Declaration Notice:</strong> Generating this evidence package
                  generates an official declaration under Sections 61, 62 & 63 of the Bharatiya
                  Sakshya Adhiniyam, 2023. Declarant:{' '}
                  <strong>{user?.fullName || user?.email}</strong> ({user?.role}).
                </p>
              </div>

              {/* Re-Authentication Password Confirmation */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Re-Authentication Password Confirmation</span>
                  <span className="text-rose-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400">
                  Please re-enter your account password to confirm authorized digital key access and
                  chain of custody.
                </p>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Enter your login password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedDocIds.length === 0 || !passwordConfirm}
                  className="flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Hashing & Signing Package...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Generate & Sign Package</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
