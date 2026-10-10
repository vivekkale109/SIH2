'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Shield,
  Download,
  ExternalLink,
  Search,
  ArrowRight,
  Briefcase,
  Clock,
  User,
  Copy,
  Check,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { ExportPackageSummary, UserRole } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

export default function ExportsOverviewPage() {
  const { user, token } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FileCheck2 className="w-7 h-7 text-indigo-400" />
            <span>Signed Evidence Packages</span>
          </h1>
          <p className="text-sm text-slate-400">
            Court-ready export packages cryptographically signed under Bharatiya Sakshya Adhiniyam,
            2023 (§61–63).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/verify"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20"
          >
            <Shield className="w-4 h-4" />
            <span>Offline Verifier Portal</span>
          </Link>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h3 className="text-base font-semibold text-white">
              How SDMS Evidence Packaging Works
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              To export court-admissible evidence, open an investigation case from{' '}
              <Link href="/cases" className="text-indigo-400 underline hover:text-indigo-300">
                Cases & Records
              </Link>
              , navigate to the <strong>Signed Exports</strong> tab, and click{' '}
              <strong>Generate Signed Evidence Package</strong>. The system performs streaming
              SHA-256 integrity verification, generates a statutory BSA 2023 §63 certificate, and
              signs the manifest with Ed25519.
            </p>
          </div>
          <Link
            href="/cases"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition shrink-0"
          >
            <span>Browse Case Files</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg w-fit text-indigo-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Generate Case Export</h3>
          <p className="text-xs text-slate-400">
            Export evidence documents, case ledger trail, and electronic evidence certificates
            directly from any investigation case.
          </p>
          <div className="pt-2">
            <Link
              href="/cases"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
            >
              <span>Go to Cases</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-white">Verify Evidence Package</h3>
          <p className="text-xs text-slate-400">
            Upload any received ZIP package to verify manifest hashes, Ed25519 signatures, and
            individual exhibit SHA-256 integrity.
          </p>
          <div className="pt-2">
            <Link
              href="/verify"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center space-x-1"
            >
              <span>Open Verifier</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
