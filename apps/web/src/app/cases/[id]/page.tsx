'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Shield,
  Clock,
  Users,
  ScrollText,
  Building,
  UserCheck,
  UserX,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Layers,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  CaseStatus,
  ClassificationLevel,
  CaseMemberRole,
  CaseDetailSummary,
  AuditLedgerEntry,
  UserRole,
  AuditAction,
} from '@sdms/shared-types';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEMO_CASE_DETAIL: CaseDetailSummary = {
  id: 'case-demo-1',
  caseNumber: 'FIR-2026-DEL-0042',
  title: 'Financial Securities Manipulation Investigation',
  description:
    'Comprehensive multi-agency inquiry into coordinated algorithmic market disruption and unauthorized order placement through compromised brokerage credentials.',
  status: CaseStatus.OPEN,
  classification: ClassificationLevel.RESTRICTED,
  departmentId: 'POL-CCB',
  createdById: 'demo-investigator-id',
  documentCount: 4,
  createdAt: '2026-09-30T09:30:00.000Z',
  updatedAt: '2026-09-30T10:15:00.000Z',
  department: {
    id: 'dept-1',
    name: 'Central Crime Branch - Police Headquarters',
    code: 'POL-CCB',
    type: 'POLICE' as any,
    createdAt: '2026-09-30T00:00:00Z',
    updatedAt: '2026-09-30T00:00:00Z',
  },
  createdBy: {
    id: 'demo-investigator-id',
    fullName: 'Inspector Rajesh Sharma',
    email: 'investigator@police.gov.in',
    badgeNumber: 'POL-INV-4412',
    role: UserRole.INVESTIGATOR,
    departmentId: 'POL-CCB',
    isActive: true,
    mfaEnabled: true,
    createdAt: '2026-09-30T00:00:00Z',
    updatedAt: '2026-09-30T00:00:00Z',
  },
  members: [
    {
      id: 'mem-1',
      caseId: 'case-demo-1',
      userId: 'demo-investigator-id',
      caseRole: CaseMemberRole.LEAD_INVESTIGATOR,
      assignedAt: '2026-09-30T09:30:00.000Z',
      user: {
        id: 'demo-investigator-id',
        fullName: 'Inspector Rajesh Sharma',
        email: 'investigator@police.gov.in',
        badgeNumber: 'POL-INV-4412',
        role: UserRole.INVESTIGATOR,
        departmentId: 'POL-CCB',
        isActive: true,
        mfaEnabled: true,
        createdAt: '2026-09-30T00:00:00Z',
        updatedAt: '2026-09-30T00:00:00Z',
      },
    },
    {
      id: 'mem-2',
      caseId: 'case-demo-1',
      userId: 'demo-prosecutor-id',
      caseRole: CaseMemberRole.PROSECUTOR,
      assignedAt: '2026-09-30T10:00:00.000Z',
      user: {
        id: 'demo-prosecutor-id',
        fullName: 'Senior Public Prosecutor Meera Sen',
        email: 'prosecutor@prosecution.gov.in',
        badgeNumber: 'PROS-OFF-208',
        role: UserRole.PROSECUTOR,
        departmentId: 'PROS-HQ',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T00:00:00Z',
        updatedAt: '2026-09-30T00:00:00Z',
      },
    },
  ],
};

const DEMO_TIMELINE: AuditLedgerEntry[] = [
  {
    id: 'tl-1',
    sequence: 12,
    timestamp: '2026-09-30T09:30:00.000Z',
    actorId: 'demo-investigator-id',
    action: AuditAction.CASE_CREATED,
    entityType: 'Case',
    entityId: 'case-demo-1',
    metadata: {
      caseNumber: 'FIR-2026-DEL-0042',
      title: 'Financial Securities Manipulation Investigation',
      classification: 'RESTRICTED',
    },
    prevHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    entryHash: 'b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
  },
  {
    id: 'tl-2',
    sequence: 14,
    timestamp: '2026-09-30T10:00:00.000Z',
    actorId: 'demo-investigator-id',
    action: AuditAction.CASE_MEMBER_ADDED,
    entityType: 'Case',
    entityId: 'case-demo-1',
    metadata: {
      targetUserId: 'demo-prosecutor-id',
      caseRole: 'PROSECUTOR',
    },
    prevHash: 'b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
    entryHash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
  },
];

export default function CaseDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const { user, token } = useAuth();
  const [caseItem, setCaseItem] = useState<CaseDetailSummary | null>(null);
  const [timeline, setTimeline] = useState<AuditLedgerEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'timeline'>('overview');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transition & Member modal states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<CaseMemberRole>(CaseMemberRole.INVESTIGATOR);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const fetchCase = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resCase, resTimeline] = await Promise.all([
        fetch(`/api/v1/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/cases/${caseId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resCase.ok) {
        const data = await resCase.json();
        setCaseItem(data);
      } else {
        const err = await resCase.json();
        setErrorMsg(err.message || 'Access restricted under ABAC policies');
      }

      if (resTimeline.ok) {
        const tlData = await resTimeline.json();
        setTimeline(tlData);
      }
    } catch (err) {
      console.error('API call failed, falling back to demo case view:', err);
      setCaseItem(DEMO_CASE_DETAIL);
      setTimeline(DEMO_TIMELINE);
    } finally {
      setLoading(false);
    }
  }, [token, caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // Fetch users for member assignment
  useEffect(() => {
    if (token) {
      fetch('/api/v1/users', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setAvailableUsers(data.items || []))
        .catch(() => {});
    }
  }, [token]);

  const handleStatusChange = async (targetStatus: CaseStatus) => {
    if (!token || !caseItem) return;
    setIsTransitioning(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: `Transitioned to ${targetStatus} via SDMS interface`,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Transition denied by policy guard');
      }
    } catch {
      // Local fallback
      setCaseItem((prev) => (prev ? { ...prev, status: targetStatus } : null));
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newMemberUserId) return;

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: newMemberUserId,
          caseRole: newMemberRole,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        setIsAddMemberOpen(false);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add member');
      }
    } catch {
      setIsAddMemberOpen(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !confirm('Remove this member from the investigation case?')) return;

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to remove member');
      }
    } catch {
      // local removal
      setCaseItem((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.userId !== userId),
            }
          : null,
      );
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

  const isLead =
    user?.role === UserRole.ADMIN ||
    caseItem?.createdById === user?.id ||
    caseItem?.members.some(
      (m) => m.userId === user?.id && m.caseRole === CaseMemberRole.LEAD_INVESTIGATOR,
    );

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted">Loading case details...</div>;
  }

  if (errorMsg || !caseItem) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto mt-12">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text">ABAC Access Restricted</h2>
        <p className="text-sm text-muted">
          {errorMsg ||
            'You do not possess the security clearance or case assignment to access this investigation file.'}
        </p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border rounded-lg text-sm font-semibold text-text hover:bg-border/30 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accessible Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Link>

        <span className="text-xs font-mono text-muted flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Created: {new Date(caseItem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Case Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-primary tracking-wide bg-primary/10 px-2.5 py-1 rounded">
                {caseItem.caseNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${getClassificationBadge(
                  caseItem.classification,
                )}`}
              >
                {caseItem.classification}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text">{caseItem.title}</h1>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {caseItem.status === CaseStatus.OPEN && (
              <button
                onClick={() => handleStatusChange(CaseStatus.UNDER_REVIEW)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition"
              >
                Submit for Review
              </button>
            )}

            {caseItem.status === CaseStatus.UNDER_REVIEW && (
              <button
                onClick={() => handleStatusChange(CaseStatus.CLOSED)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg transition"
              >
                Close Case
              </button>
            )}

            {caseItem.status === CaseStatus.CLOSED && (
              <button
                onClick={() => handleStatusChange(CaseStatus.ARCHIVED)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-xs font-bold rounded-lg transition"
              >
                Archive in Vault
              </button>
            )}

            {(caseItem.status === CaseStatus.CLOSED || caseItem.status === CaseStatus.ARCHIVED) &&
              isLead && (
                <button
                  onClick={() => handleStatusChange(CaseStatus.OPEN)}
                  disabled={isTransitioning}
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold rounded-lg transition"
                >
                  Reopen Case
                </button>
              )}
          </div>
        </div>

        {/* Lifecycle Stepper */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Lifecycle State:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                CaseStatus.OPEN,
                CaseStatus.UNDER_REVIEW,
                CaseStatus.CLOSED,
                CaseStatus.ARCHIVED,
              ].map((step, idx) => {
                const isActive = caseItem.status === step;
                return (
                  <div key={step} className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-alt text-muted border border-border/50'
                      }`}
                    >
                      {step.replace('_', ' ')}
                    </span>
                    {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-muted/40" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'overview'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Overview & Documents
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'members'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <Users className="w-4 h-4" />
          Case Members ({caseItem.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'timeline'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Audit Timeline ({timeline.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-text">Investigation Synopsis</h3>
              <p className="text-xs text-muted leading-relaxed">
                {caseItem.description || 'No description provided for this case file.'}
              </p>
            </div>

            {/* Evidence Documents Section (Phase 4 Hook) */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Case Evidence Files
                  </h3>
                  <p className="text-xs text-muted">
                    SHA-256 hashed and versioned documents attached to this investigation.
                  </p>
                </div>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Evidence (Phase 4)
                </Link>
              </div>

              <div className="border border-dashed border-border rounded-xl p-8 text-center bg-surface-alt/50">
                <FileText className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-text">
                  {caseItem.documentCount || 0} Files Currently Attached
                </p>
                <p className="text-[11px] text-muted max-w-sm mx-auto mt-1">
                  Document ingestion pipeline with ClamAV malware scan and SHA-256 hash anchoring
                  will be initialized in Phase 4.
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Case Classification Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">Originating Department</span>
                  <span className="font-semibold text-text">
                    {caseItem.department?.name || caseItem.departmentId}
                  </span>
                </div>

                <div>
                  <span className="text-muted block text-[11px]">Case Creator</span>
                  <span className="font-semibold text-text">
                    {caseItem.createdBy?.fullName || caseItem.createdById}
                  </span>
                  <span className="text-[11px] text-muted block">{caseItem.createdBy?.email}</span>
                </div>

                <div>
                  <span className="text-muted block text-[11px]">Security Clearance</span>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getClassificationBadge(
                      caseItem.classification,
                    )}`}
                  >
                    {caseItem.classification}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Assigned Investigation Team</h3>
              <p className="text-xs text-muted">
                Users explicitly assigned to this case receive ABAC clearance even on CONFIDENTIAL
                and SECRET tiers.
              </p>
            </div>

            {isLead && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Member
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt border-y border-border text-muted font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Officer / User</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Case Role</th>
                  <th className="py-2.5 px-4">Assigned On</th>
                  {isLead && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {caseItem.members?.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-alt/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text">{m.user?.fullName || m.userId}</div>
                      <div className="text-[11px] text-muted">{m.user?.email}</div>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {m.user?.departmentId || 'Department HQ'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded text-[11px]">
                        <UserCheck className="w-3 h-3" />
                        {m.caseRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {new Date(m.assignedAt).toLocaleDateString()}
                    </td>
                    {isLead && (
                      <td className="py-3 px-4 text-right">
                        {m.caseRole !== CaseMemberRole.LEAD_INVESTIGATOR && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-rose-500 hover:text-rose-700 font-semibold text-[11px] transition"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              Cryptographic Case Audit Trail
            </h3>
            <p className="text-xs text-muted">
              Immutable ledger sequence entries recorded directly from the hash-chained audit
              system.
            </p>
          </div>

          <div className="space-y-3">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">
                No audit events recorded yet.
              </div>
            ) : (
              timeline.map((event) => (
                <div
                  key={event.id}
                  className="bg-surface-alt border border-border rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted bg-border/40 px-1.5 py-0.5 rounded">
                        Seq #{event.sequence}
                      </span>
                      <span className="font-bold text-primary">{event.action}</span>
                    </div>
                    <div className="text-[11px] font-mono text-muted truncate max-w-md">
                      Hash: {event.entryHash}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text">Assign Team Member</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-muted p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Select User</label>
                <select
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role} - {u.email})
                    </option>
                  ))}
                  {/* Fallback demo user options if api is offline */}
                  {availableUsers.length === 0 && (
                    <>
                      <option value="demo-prosecutor-id">
                        Senior Public Prosecutor Meera Sen (PROSECUTOR)
                      </option>
                      <option value="demo-court-id">Registrar K. V. Raman (COURT_OFFICER)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Case Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as CaseMemberRole)}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={CaseMemberRole.INVESTIGATOR}>Investigator</option>
                  <option value={CaseMemberRole.PROSECUTOR}>Prosecutor</option>
                  <option value={CaseMemberRole.REVIEWER}>Reviewer</option>
                  <option value={CaseMemberRole.LEAD_INVESTIGATOR}>Lead Investigator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
