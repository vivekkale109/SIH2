'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Upload,
  FileArchive,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  RefreshCw,
  FileText,
  Lock,
  ScrollText,
  HelpCircle,
} from 'lucide-react';
import { PackageVerificationResult } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

export default function VerifyPage() {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<PackageVerificationResult | null>(null);
  const [copiedCert, setCopiedCert] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a valid SDMS ZIP evidence package archive (.zip).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file && (file.name.endsWith('.zip') || file.type.includes('zip'))) {
        setSelectedFile(file);
        setErrorMsg(null);
      } else {
        setErrorMsg('Please upload a valid SDMS ZIP evidence package archive (.zip).');
      }
    }
  };

  const handleRunVerification = async () => {
    if (!selectedFile) return;

    setVerifying(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('package', selectedFile);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/exports/verify', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Verification endpoint error' }));
        throw new Error(err.message || 'Failed to verify evidence package archive');
      }

      const data: PackageVerificationResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during verification.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyCertificate = () => {
    if (!result?.certificateText) return;
    void navigator.clipboard.writeText(result.certificateText);
    setCopiedCert(true);
    setTimeout(() => setCopiedCert(false), 2500);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Link href="/" className="hover:text-white transition flex items-center space-x-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to SDMS</span>
              </Link>
              <span>/</span>
              <span className="text-indigo-400">Evidence Verification</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
              <FileCheck2 className="w-7 h-7 text-indigo-400" />
              <span>Court Evidence Package Verifier</span>
            </h1>
            <p className="text-sm text-slate-400">
              Independent cryptographic validation engine aligned with Sections 61, 62 & 63 of the
              Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023).
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>Ed25519 & SHA-256 Engine</span>
            </span>
          </div>
        </div>

        {/* Upload & Dropzone Area */}
        {!result && (
          <div className="space-y-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-4 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                  : selectedFile
                    ? 'border-indigo-500/50 bg-slate-900/80'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400">
                <FileArchive className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Drag & drop an SDMS evidence package (.zip)'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for cryptographic inspection`
                    : 'or click to browse your local filesystem'}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 max-w-md">
                Package must contain manifest.json, certificate_BSA_2023.txt, signature.sig,
                pubkey.pem, and exhibits under documents/.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3 text-rose-300 text-sm">
                <ShieldX className="w-5 h-5 mt-0.5 shrink-0 text-rose-400" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-rose-200">Verification Request Failed</h4>
                  <p className="text-xs">{errorMsg}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {selectedFile && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={verifying}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Clear Selection
                </button>
              )}
              <button
                type="button"
                onClick={handleRunVerification}
                disabled={!selectedFile || verifying}
                className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition shadow-lg shadow-indigo-600/20"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Decompressing & Validating Signatures...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Run Cryptographic Verification</span>
                  </>
                )}
              </button>
            </div>

            {/* Offline CLI Instructions Callout */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-xs text-slate-400 space-y-2">
              <div className="flex items-center space-x-2 text-slate-300 font-medium">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <span>Offline Air-Gapped Verification via Standalone CLI:</span>
              </div>
              <p>
                In secure court chambers or air-gapped forensic labs without internet access, verify
                the package directly using the standalone CLI:
              </p>
              <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-emerald-400 border border-slate-800 select-all">
                npx @sdms/verifier path/to/evidence_package.zip
              </div>
            </div>
          </div>
        )}

        {/* Verification Verdict & Results Report */}
        {result && (
          <div className="space-y-6">
            {/* Master Verdict Banner */}
            {result.verified ? (
              <div className="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-xl shadow-emerald-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
                        Verified Valid
                      </span>
                      <span className="text-xs text-emerald-400/80 font-mono">STATUS: VALID</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Court-Ready Evidence Package Authentic
                    </h2>
                    <p className="text-xs text-slate-300">
                      Canonical manifest SHA-256 matches, Ed25519 digital signature is
                      cryptographically valid, all document exhibits match recorded hashes, and the
                      audit ledger chain is continuous.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Another Package</span>
                </button>
              </div>
            ) : (
              <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-6 shadow-xl shadow-rose-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 uppercase tracking-wide">
                        Tamper Detected
                      </span>
                      <span className="text-xs text-rose-400/80 font-mono">
                        STATUS: {result.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white">
                      Evidence Package Integrity Compromised
                    </h2>
                    <p className="text-xs text-slate-300">
                      The uploaded evidence package does not satisfy cryptographic court
                      admissibility checks. Do not accept into formal judicial proceedings.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Another Package</span>
                </button>
              </div>
            )}

            {/* Error Violations List if Invalid */}
            {result.errors.length > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Detected Violations ({result.errors.length}):</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90 font-mono">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Package Provenance Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Case Reference / FIR
                </div>
                <div className="text-sm font-semibold text-white">{result.caseNumber || 'N/A'}</div>
                <div className="text-xs text-slate-400 truncate">{result.caseTitle}</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Declarant & Officer Role
                </div>
                <div className="text-sm font-semibold text-white truncate">
                  {result.exportedBy || 'N/A'}
                </div>
                <div className="text-xs text-slate-400">
                  {result.exportedAt ? new Date(result.exportedAt).toLocaleString() : 'N/A'}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1 md:col-span-2 lg:col-span-1">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Package UUID Reference
                </div>
                <div className="text-xs font-mono text-indigo-300 truncate">
                  {result.packageId || 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500">Immutable ledger identifier</div>
              </div>
            </div>

            {/* 3 Core Verification Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Manifest Hash */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Manifest SHA-256</span>
                  {result.manifestHashValid ? (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Valid</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Tampered</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Canonical JSON digest over all package metadata, case references, and document
                  declarations.
                </p>
              </div>

              {/* Ed25519 Signature */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">Ed25519 Signature</span>
                  {result.signatureValid ? (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Authentic</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Invalid</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Elliptic curve digital signature verifying authentic issuing origin and
                  non-repudiation.
                </p>
              </div>

              {/* Audit Chain */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Audit Ledger Continuity
                  </span>
                  {result.auditChainValid ? (
                    <span className="flex items-center space-x-1 text-xs text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Gapless</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-xs text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Broken</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Chronological prevHash → entryHash integrity chaining of investigative chain of
                  custody entries.
                </p>
              </div>
            </div>

            {/* Exhibits Verification Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Evidence Exhibits Integrity Checks ({result.documentsChecked.length} Files)
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">NIST FIPS 180-4 SHA-256</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-800">
                  <thead className="bg-slate-950/80 text-slate-400 font-medium">
                    <tr>
                      <th className="px-5 py-3">Document Title & Path</th>
                      <th className="px-5 py-3">Expected Manifest Hash</th>
                      <th className="px-5 py-3">Recomputed File Hash</th>
                      <th className="px-5 py-3 text-right">Integrity Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {result.documentsChecked.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                          No embedded documents declared in this package.
                        </td>
                      </tr>
                    ) : (
                      result.documentsChecked.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition">
                          <td className="px-5 py-3.5 font-sans">
                            <div className="font-medium text-white">{doc.title}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {doc.relativePath}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-300 text-[11px] max-w-xs truncate">
                            {doc.expectedHash}
                          </td>
                          <td className="px-5 py-3.5 text-slate-300 text-[11px] max-w-xs truncate">
                            {doc.computedHash}
                          </td>
                          <td className="px-5 py-3.5 text-right font-sans">
                            {doc.match ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>MATCH</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                <span>TAMPERED</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bharatiya Sakshya Adhiniyam, 2023 §63 Certificate View */}
            {result.certificateText && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-0">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                  <div className="flex items-center space-x-2">
                    <ScrollText className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">
                      Bharatiya Sakshya Adhiniyam, 2023 (§61, 62 & 63) Electronic Evidence
                      Certificate
                    </h3>
                  </div>
                  <button
                    onClick={handleCopyCertificate}
                    className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  >
                    {copiedCert ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Certificate Text</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5 bg-slate-950">
                  <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-all overflow-x-auto">
                    {result.certificateText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
