'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Shield,
  Clock,
  ArrowRight,
  Layers,
  Building,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CaseStatus, ClassificationLevel, CaseSummary, UserRole } from '@sdms/shared-types';

const DEMO_CASES: CaseSummary[] = [
  {
    id: 'case-demo-1',
    caseNumber: 'FIR-2026-DEL-0042',
    title: 'Financial Securities Manipulation Investigation',
    description:
      'Investigation into fraudulent algorithmic spoofing across major state stock repositories.',
    status: CaseStatus.OPEN,
    classification: ClassificationLevel.RESTRICTED,
    departmentId: 'POL-CCB',
    createdById: 'demo-investigator-id',
    documentCount: 4,
    createdAt: '2026-09-30T09:30:00.000Z',
    updatedAt: '2026-09-30T10:15:00.000Z',
  },
  {
    id: 'case-demo-2',
    caseNumber: 'FIR-2026-CYB-0089',
    title: 'Critical Infrastructure Ransomware Infiltration',
    description:
      'Cross-border ransomware deployment targeting municipal electrical distribution SCADA gateways.',
    status: CaseStatus.UNDER_REVIEW,
    classification: ClassificationLevel.SECRET,
    departmentId: 'POL-CCB',
    createdById: 'demo-investigator-id',
    documentCount: 7,
    createdAt: '2026-09-29T14:20:00.000Z',
    updatedAt: '2026-09-30T11:45:00.000Z',
  },
  {
    id: 'case-demo-3',
    caseNumber: 'FIR-2026-DEL-0105',
    title: 'Counterfeit Currency & Hawala Ring',
    description:
      'Seizure of high-precision fake currency notes and clandestine cross-border ledger reconciliation.',
    status: CaseStatus.CLOSED,
    classification: ClassificationLevel.CONFIDENTIAL,
    departmentId: 'POL-CCB',
    createdById: 'demo-investigator-id',
    documentCount: 12,
    createdAt: '2026-09-25T11:00:00.000Z',
    updatedAt: '2026-09-30T08:10:00.000Z',
  },
];

export default function CasesPage() {
  const { user, token } = useAuth();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Case Form State
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newClassification, setNewClassification] = useState<ClassificationLevel>(
    ClassificationLevel.RESTRICTED,
  );

  const fetchCases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (classificationFilter) params.append('classification', classificationFilter);

      const res = await fetch(`/api/v1/cases?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCases(data.items || []);
        return;
      }
    } catch (err) {
      console.error('Failed to fetch cases from API, falling back to demo data:', err);
    } finally {
      setLoading(false);
    }

    // Fallback demo filtering
    const filtered = DEMO_CASES.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (classificationFilter && c.classification !== classificationFilter) return false;
      if (
        search &&
        !c.caseNumber.toLowerCase().includes(search.toLowerCase()) &&
        !c.title.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
    setCases(filtered);
  }, [token, search, statusFilter, classificationFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseNumber.trim() || !newTitle.trim()) {
      setErrorMsg('Case number and title are required');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caseNumber: newCaseNumber.trim(),
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          classification: newClassification,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to create case' }));
        throw new Error(err.message || 'Creation failed');
      }

      setIsCreateOpen(false);
      setNewCaseNumber('');
      setNewTitle('');
      setNewDescription('');
      fetchCases();
    } catch (err: any) {
      // Local fallback for offline mode
      const created: CaseSummary = {
        id: `case-local-${Date.now()}`,
        caseNumber: newCaseNumber.trim(),
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        status: CaseStatus.OPEN,
        classification: newClassification,
        departmentId: user?.departmentId || 'POL-CCB',
        createdById: user?.id || 'demo-investigator-id',
        documentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCases((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      setNewCaseNumber('');
      setNewTitle('');
      setNewDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.OPEN:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case CaseStatus.UNDER_REVIEW:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case CaseStatus.CLOSED:
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case CaseStatus.ARCHIVED:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  const getClassificationBadge = (level: ClassificationLevel) => {
    switch (level) {
      case ClassificationLevel.PUBLIC:
        return 'bg-[#DCFCE7] text-[#166534] border-[#166534]/20';
      case ClassificationLevel.RESTRICTED:
        return 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]/20';
      case ClassificationLevel.CONFIDENTIAL:
        return 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]/20';
      case ClassificationLevel.SECRET:
        return 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  const canCreate = user?.role === UserRole.ADMIN || user?.role === UserRole.INVESTIGATOR;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-primary" />
            Investigation Cases
          </h1>
          <p className="text-sm text-muted mt-0.5">
            Case-centric evidentiary repository protected by Attribute-Based Access Control (ABAC).
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setNewCaseNumber(`FIR-2026-DEL-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Case
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by case number or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">All Statuses</option>
              <option value={CaseStatus.OPEN}>Open</option>
              <option value={CaseStatus.UNDER_REVIEW}>Under Review</option>
              <option value={CaseStatus.CLOSED}>Closed</option>
              <option value={CaseStatus.ARCHIVED}>Archived</option>
            </select>
          </div>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Classifications</option>
            <option value={ClassificationLevel.PUBLIC}>Public</option>
            <option value={ClassificationLevel.RESTRICTED}>Restricted</option>
            <option value={ClassificationLevel.CONFIDENTIAL}>Confidential</option>
            <option value={ClassificationLevel.SECRET}>Secret</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted text-sm">
          Loading investigation cases...
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Briefcase className="w-12 h-12 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-text">No cases found</h3>
          <p className="text-sm text-muted max-w-sm mx-auto mt-1">
            Either no cases match your filters, or your ABAC security clearance restricts viewing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cases.map((c) => (
            <div
              key={c.id}
              className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:border-primary/50 transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary tracking-wide">
                    {c.caseNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getClassificationBadge(
                      c.classification,
                    )}`}
                  >
                    {c.classification}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-text line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted line-clamp-2 mt-1">
                    {c.description || 'No summary description provided.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusBadge(
                      c.status,
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {c.status.replace('_', ' ')}
                  </span>

                  <span className="text-muted flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {c.documentCount || 0} Docs
                  </span>
                </div>

                <Link
                  href={`/cases/${c.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-alt hover:bg-border/30 text-text font-semibold text-xs rounded-lg border border-border transition group"
                >
                  View Case Details
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text">Create Investigation Case</h3>
                <p className="text-xs text-muted">
                  Case will be sealed and assigned to you as Lead Investigator.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted hover:text-text transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Case / FIR Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  placeholder="e.g. FIR-2026-DEL-0042"
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Investigation Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Corporate Embezzlement Syndicate"
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Security Classification
                </label>
                <select
                  value={newClassification}
                  onChange={(e) => setNewClassification(e.target.value as ClassificationLevel)}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={ClassificationLevel.RESTRICTED}>
                    RESTRICTED — Standard departmental access
                  </option>
                  <option value={ClassificationLevel.CONFIDENTIAL}>
                    CONFIDENTIAL — Assigned team members only
                  </option>
                  <option value={ClassificationLevel.SECRET}>
                    SECRET — Top clearance and explicit assignment
                  </option>
                  <option value={ClassificationLevel.PUBLIC}>PUBLIC — Open public record</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Summary & Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Initial FIR synopsis and scope of inquiry..."
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Creating Case...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
