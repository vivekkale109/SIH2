'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Archive,
  Search,
  Filter,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  Download,
  Lock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { ClassificationBadge, Badge } from '@/components/ui/Badge';
import { ClassificationLevel, CaseStatus } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface VaultRecord {
  id: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  classification: ClassificationLevel;
  archivedAt: string;
  documentsCount: number;
  totalSizeMb: number;
  retentionMaturityYear: number;
}

const DEMO_VAULT_RECORDS: VaultRecord[] = [
  {
    id: 'case-vault-1',
    caseNumber: 'FIR-2024-089',
    title: 'Financial Irregularities Investigation (State Treasury)',
    status: CaseStatus.ARCHIVED,
    classification: ClassificationLevel.CONFIDENTIAL,
    archivedAt: '2024-11-14',
    documentsCount: 14,
    totalSizeMb: 42.8,
    retentionMaturityYear: 2044,
  },
  {
    id: 'case-vault-2',
    caseNumber: 'FIR-2023-014',
    title: 'Organised Cargo Theft Nexus',
    status: CaseStatus.ARCHIVED,
    classification: ClassificationLevel.RESTRICTED,
    archivedAt: '2023-08-02',
    documentsCount: 9,
    totalSizeMb: 18.5,
    retentionMaturityYear: 2033,
  },
  {
    id: 'case-vault-3',
    caseNumber: 'SEC-2022-005',
    title: 'State Cybersecurity Breach Dossier',
    status: CaseStatus.ARCHIVED,
    classification: ClassificationLevel.SECRET,
    archivedAt: '2022-04-19',
    documentsCount: 31,
    totalSizeMb: 112.4,
    retentionMaturityYear: 2072,
  },
  {
    id: 'case-vault-4',
    caseNumber: 'CR-2025-110',
    title: 'Commercial Trademark Infringement & Counterfeit Audit',
    status: CaseStatus.CLOSED,
    classification: ClassificationLevel.RESTRICTED,
    archivedAt: '2025-09-30',
    documentsCount: 6,
    totalSizeMb: 8.2,
    retentionMaturityYear: 2035,
  },
];

export default function RecordsVaultPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<VaultRecord[]>(DEMO_VAULT_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  const filtered = records.filter((r) => {
    if (classFilter !== 'ALL' && r.classification !== classFilter) return false;
    if (
      searchQuery &&
      !r.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary font-mono uppercase">
              Phase 8 Feature
            </span>
            <span className="text-xs text-muted">• Long-Term Records Vault</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2 flex items-center space-x-2.5">
            <Archive className="h-7 w-7 text-primary" />
            <span>Digital Records Vault & Long-Term Evidence Archive</span>
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Cryptographically sealed repository for concluded and archived legal cases. Stored with
            immutable SHA-256 byte seals in MinIO object storage, safeguarded from modification or
            premature deletion until statutory retention expiration.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/retention"
            className="inline-flex items-center space-x-2 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Retention Schedule</span>
          </Link>
        </div>
      </div>

      {/* Vault Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Preserved Records</span>
            <Archive className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold text-text mt-1">{records.length} Case Dossiers</p>
          <p className="text-xs text-muted mt-2">60 Total Exhibits Sealed</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Vault Storage</span>
            <Lock className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xl font-bold text-text mt-1">181.9 MB</p>
          <p className="text-xs text-muted mt-2">AES-256 SSE Encrypted</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Integrity Status</span>
            <ShieldCheck className="w-4 h-4 text-success" />
          </div>
          <p className="text-xl font-bold text-success mt-1">100% Intact</p>
          <p className="text-xs text-muted mt-2">Zero SHA-256 drift</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">Earliest Maturity</span>
            <Calendar className="w-4 h-4 text-warning" />
          </div>
          <p className="text-xl font-bold text-text mt-1">Year 2033</p>
          <p className="text-xs text-muted mt-2">7 Years Remaining</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search archived vault dossiers by case number or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-alt border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
          <span className="text-xs text-muted">Tier:</span>
          {['ALL', 'SECRET', 'CONFIDENTIAL', 'RESTRICTED'].map((tier) => (
            <button
              key={tier}
              onClick={() => setClassFilter(tier)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                classFilter === tier
                  ? 'bg-primary text-white'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Archived Vault Records List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface-alt/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text flex items-center space-x-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Preserved Evidence Dossiers in Vault</span>
          </h2>
          <span className="text-xs text-muted font-mono">{filtered.length} Dossiers</span>
        </div>

        <div className="divide-y divide-border">
          {filtered.map((record) => (
            <div key={record.id} className="p-5 hover:bg-surface-alt/20 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="text-sm font-bold text-text">{record.caseNumber}</span>
                    <ClassificationBadge level={record.classification} className="text-[10px]" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-alt text-muted border border-border">
                      Archived: {record.archivedAt}
                    </span>
                    <span className="text-[10px] font-semibold text-success flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SHA-256 Verified</span>
                    </span>
                  </div>
                  <h3 className="text-xs font-medium text-text">{record.title}</h3>
                  <p className="text-xs text-muted">
                    {record.documentsCount} Documents · {record.totalSizeMb} MB · Scheduled Purge
                    Review:{' '}
                    <span className="font-bold text-primary">{record.retentionMaturityYear}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <Link
                    href={`/cases/${record.id}`}
                    className="inline-flex items-center space-x-1.5 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
