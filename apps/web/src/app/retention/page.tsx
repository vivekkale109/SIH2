'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Archive,
  ShieldCheck,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Filter,
  Search,
  Plus,
  ArrowRight,
  FileText,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ClassificationBadge, Badge } from '@/components/ui/Badge';
import { ClassificationLevel, RetentionPolicy } from '@sdms/shared-types';

const STATUTORY_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'ret-1',
    category: 'Heinous & Serious Offences (BNS 2023 Ch. V & VI)',
    classification: 'SECRET',
    statuteReference: 'BNS 2023 §103, §111 · CrPC/BNSS 2023 §193',
    retentionYears: 50,
    description:
      'Homicide, organised crime syndicate cases, terrorism, and state security dossiers requiring multi-decade preservation.',
    autoArchive: true,
    archivalAction: 'PERMANENT_PRESERVE',
  },
  {
    id: 'ret-2',
    category: 'Economic & Financial Frauds (PMLA / BNS)',
    classification: 'CONFIDENTIAL',
    statuteReference: 'Prevention of Money Laundering Act · BNS §316',
    retentionYears: 20,
    description:
      'Corporate fraud, bank money laundering trails, and asset forfeiture documentation requiring extended judicial review.',
    autoArchive: true,
    archivalAction: 'ARCHIVE',
  },
  {
    id: 'ret-3',
    category: 'Cyber Crimes & Digital Evidence (IT Act 2000 & BSA 2023)',
    classification: 'CONFIDENTIAL',
    statuteReference: 'IT Act §66, §70 · BSA 2023 §61–63',
    retentionYears: 15,
    description:
      'Electronic evidence extractions, server logs, cyber fraud trails, and forensic disk images with Ed25519 signatures.',
    autoArchive: true,
    archivalAction: 'ARCHIVE',
  },
  {
    id: 'ret-4',
    category: 'General Police Investigation Dossiers',
    classification: 'RESTRICTED',
    statuteReference: 'Police Regulations Para 182 · BNSS 2023',
    retentionYears: 10,
    description:
      'Standard investigation records, FIRs, charge sheets, witness statements, and evidence seizure memos.',
    autoArchive: true,
    archivalAction: 'ARCHIVE',
  },
  {
    id: 'ret-5',
    category: 'Public Enquiries & Administrative Gazettes',
    classification: 'PUBLIC',
    statuteReference: 'Public Records Act 1993 §7',
    retentionYears: 5,
    description:
      'Public legal gazettes, citizen enquiry memos, and unclassified department notifications.',
    autoArchive: false,
    archivalAction: 'REVIEW_REQUIRED',
  },
  {
    id: 'ret-6',
    category: 'System Audit Ledger & Chain of Custody',
    classification: 'SECRET',
    statuteReference: 'BSA 2023 §63(4) · Indian Evidence Integrity Mandate',
    retentionYears: 100,
    description:
      'SHA-256 append-only transaction ledger, forensic logs, and Ed25519 export manifests. Never purged or truncated.',
    autoArchive: true,
    archivalAction: 'PERMANENT_PRESERVE',
  },
];

const DEMO_CASE_RETENTION_TRACKER = [
  {
    id: 'case-demo-1',
    caseNumber: 'FIR-2026-001',
    title: 'Cyber Fraud Syndicate Investigation',
    classification: ClassificationLevel.RESTRICTED,
    policyCategory: 'Cyber Crimes & Digital Evidence',
    status: 'OPEN',
    createdDate: '2026-01-15',
    retentionPeriodYears: 15,
    projectedPurgeYear: '2041',
    lifecycleState: 'Active Ingestion',
  },
  {
    id: 'case-demo-2',
    caseNumber: 'FIR-2026-002',
    title: 'State Intercept Dossier - Organised Nexus',
    classification: ClassificationLevel.SECRET,
    policyCategory: 'Heinous & Serious Offences',
    status: 'UNDER_REVIEW',
    createdDate: '2026-02-10',
    retentionPeriodYears: 50,
    projectedPurgeYear: '2076',
    lifecycleState: 'Prosecution Review',
  },
  {
    id: 'case-demo-3',
    caseNumber: 'CR-2025-089',
    title: 'Financial Embezzlement Audit (Cooperative Bank)',
    classification: ClassificationLevel.CONFIDENTIAL,
    policyCategory: 'Economic & Financial Frauds',
    status: 'CLOSED',
    createdDate: '2025-06-20',
    retentionPeriodYears: 20,
    projectedPurgeYear: '2045',
    lifecycleState: 'Eligible for Vault Archival',
  },
  {
    id: 'case-demo-4',
    caseNumber: 'CR-2024-012',
    title: 'Illegal Substance Seizure Memo Batch',
    classification: ClassificationLevel.RESTRICTED,
    policyCategory: 'General Police Investigation Dossiers',
    status: 'ARCHIVED',
    createdDate: '2024-03-11',
    retentionPeriodYears: 10,
    projectedPurgeYear: '2034',
    lifecycleState: 'Permanently Sealed in Vault',
  },
];

export default function RetentionPage() {
  const [policies] = useState<RetentionPolicy[]>(STATUTORY_RETENTION_POLICIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  const filteredPolicies = policies.filter((p) => {
    if (selectedClassFilter !== 'ALL' && p.classification !== selectedClassFilter) {
      return false;
    }
    if (
      searchTerm &&
      !p.category.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !p.statuteReference.toLowerCase().includes(searchTerm.toLowerCase())
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
            <span className="text-xs text-muted">• Records Manager Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2 flex items-center space-x-2.5">
            <Clock className="h-7 w-7 text-primary" />
            <span>Statutory Evidence Retention & Lifecycle Policies</span>
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Compliant with Bharatiya Sakshya Adhiniyam, 2023 (BSA 2023), BNSS 2023, and Indian
            Police Documentation Regulations. Configures automated case archival, retention clocks,
            and permanent preservation schedules.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            href="/records"
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Open Records Vault</span>
          </Link>
        </div>
      </div>

      {/* Lifecycle Flow Architecture Card */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-text mb-2">
          Automated Evidence Lifecycle Pipeline
        </h2>
        <p className="text-xs text-muted mb-6">
          Evidence progresses through four strictly enforced lifecycle stages governed by role
          clearance:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          <div className="p-4 bg-surface-alt border border-border rounded-lg relative">
            <span className="text-[10px] font-mono text-primary uppercase font-bold">Stage 1</span>
            <h3 className="text-sm font-bold text-text mt-1">OPEN</h3>
            <p className="text-xs text-muted mt-1">
              Active police investigation. Unrestricted document versioning, malware scan, and OCR
              extraction.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg relative">
            <span className="text-[10px] font-mono text-warning uppercase font-bold">Stage 2</span>
            <h3 className="text-sm font-bold text-text mt-1">UNDER REVIEW</h3>
            <p className="text-xs text-muted mt-1">
              Prosecution examination & court exhibit packaging. Ed25519 signed exports generated.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg relative">
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 uppercase font-bold">
              Stage 3
            </span>
            <h3 className="text-sm font-bold text-text mt-1">CLOSED</h3>
            <p className="text-xs text-muted mt-1">
              Trial concluded or judgment rendered. Case locked from new uploads; retention clock
              begins.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg relative">
            <span className="text-[10px] font-mono text-success uppercase font-bold">Stage 4</span>
            <h3 className="text-sm font-bold text-text mt-1">ARCHIVED (VAULT)</h3>
            <p className="text-xs text-muted mt-1">
              Permanently immutable. Cryptographically sealed in MinIO vault until statutory
              retention maturity.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search statutory rules by statute reference or crime category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-alt border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
          <span className="text-xs text-muted">Tier:</span>
          {['ALL', 'SECRET', 'CONFIDENTIAL', 'RESTRICTED', 'PUBLIC'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedClassFilter(lvl)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                selectedClassFilter === lvl
                  ? 'bg-primary text-white'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Statutory Retention Schedule Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface-alt/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text">
              Indian Statutory Retention Schedule Matrix
            </h2>
          </div>
          <span className="text-xs text-muted font-mono">
            {filteredPolicies.length} Active Rules
          </span>
        </div>

        <div className="divide-y divide-border">
          {filteredPolicies.map((rule) => (
            <div key={rule.id} className="p-5 hover:bg-surface-alt/20 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <span className="text-sm font-bold text-text">{rule.category}</span>
                    <ClassificationBadge
                      level={rule.classification as ClassificationLevel}
                      className="text-[10px]"
                    />
                    <span className="text-xs font-mono text-muted bg-surface-alt px-2 py-0.5 rounded border border-border">
                      {rule.statuteReference}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{rule.description}</p>
                </div>

                <div className="flex items-center space-x-6 shrink-0 pt-2 md:pt-0">
                  <div className="text-right">
                    <p className="text-xs text-muted">Retention Mandate</p>
                    <p className="text-base font-bold text-text font-mono">
                      {rule.retentionYears >= 100 ? 'INDEFINITE' : `${rule.retentionYears} Years`}
                    </p>
                  </div>

                  <div className="text-right min-w-[130px]">
                    <p className="text-xs text-muted">Archival Action</p>
                    <span
                      className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 ${
                        rule.archivalAction === 'PERMANENT_PRESERVE'
                          ? 'bg-success/15 text-success'
                          : rule.archivalAction === 'ARCHIVE'
                            ? 'bg-primary/15 text-primary'
                            : 'bg-warning/15 text-warning'
                      }`}
                    >
                      {rule.archivalAction.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Case Retention Tracker */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface-alt/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text">Live Case Retention Schedule Tracker</h2>
          </div>
          <span className="text-xs text-muted font-mono">Real-time Archival Clocks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-alt text-muted uppercase font-mono text-[10px] border-b border-border">
              <tr>
                <th className="p-3">Case Reference</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Applicable Mandate</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
                <th className="p-3">Projected Maturity</th>
                <th className="p-3">Lifecycle State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {DEMO_CASE_RETENTION_TRACKER.map((item) => (
                <tr key={item.id} className="hover:bg-surface-alt/30 transition-colors">
                  <td className="p-3 font-semibold text-text">
                    <Link
                      href={`/cases/${item.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {item.caseNumber}
                    </Link>
                    <div className="text-[11px] text-muted font-normal truncate max-w-xs">
                      {item.title}
                    </div>
                  </td>
                  <td className="p-3">
                    <ClassificationBadge level={item.classification} className="text-[10px]" />
                  </td>
                  <td className="p-3 text-muted">{item.policyCategory}</td>
                  <td className="p-3">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-surface-alt text-text border border-border">
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-muted">{item.createdDate}</td>
                  <td className="p-3 font-mono font-bold text-primary">
                    {item.projectedPurgeYear}
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] font-semibold text-success flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.lifecycleState}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
